import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import sys
from uuid import uuid4
import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

def migrate(dsn):
    sources = [("data-v1", ROOT.parent / "yogya-data/sql/schema.sql"),
               ("backend-v1", ROOT / "migrations/001.sql")]
    with psycopg.connect(dsn) as db:
        db.execute("SELECT pg_advisory_xact_lock(188099)")
        db.execute("CREATE TABLE IF NOT EXISTS yogya_migrations "
                   "(version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ DEFAULT now())")
        for version, path in sources:
            content = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(content.encode()).hexdigest()
            old = db.execute("SELECT checksum FROM yogya_migrations WHERE version=%s",
                             (version,)).fetchone()
            if old:
                if old[0] != checksum:
                    raise RuntimeError("An applied migration was modified: " + version)
                continue
            db.execute(content, prepare=False)
            db.execute("INSERT INTO yogya_migrations(version,checksum) VALUES (%s,%s)", (version, checksum))

def account(dsn, role):
    identifier, token = str(uuid4()), secrets.token_urlsafe(32)
    with psycopg.connect(dsn) as db:
        db.execute("INSERT INTO yogya_accounts(id,role,token_hash,expires_at) "
                   "VALUES (%s,%s,%s,now()+interval '7 days')",
                   (identifier, role, hashlib.sha256(token.encode()).hexdigest()))
    return identifier, token

def seed(dsn):
    # Reuse Person 4's validator and transactional importer without copying its schema.
    sys.path.insert(0, str(ROOT.parent / "yogya-data"))
    from src.database import DatabaseImporter
    path = ROOT.parent / "yogya-data/data/processed/opportunities_verified.json"
    records = json.loads(path.read_text(encoding="utf-8"))
    records = [r for r in records if r.get("verification_status") == "verified" and r.get("synthetic") is False]
    report = DatabaseImporter(dsn).import_records(records)
    if report["mode"] != "live_database" or report["failed"] or report.get("error"):
        raise RuntimeError("Seed import did not complete in live database mode")
    return len(records)

def assign(dsn, facilitator, student):
    with psycopg.connect(dsn) as db:
        valid = db.execute("SELECT id FROM yogya_accounts WHERE id=%s AND role='facilitator'",
                           (facilitator,)).fetchone()
        if not valid:
            raise RuntimeError("Facilitator not found")
        db.execute("INSERT INTO yogya_assignments(facilitator_id,student_id) VALUES (%s,%s) "
                   "ON CONFLICT DO NOTHING", (facilitator, student))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("migrate")
    sub.add_parser("seed")
    create = sub.add_parser("account")
    create.add_argument("role", choices=["student", "facilitator"])
    rotate = sub.add_parser("rotate")
    rotate.add_argument("account_id")
    link = sub.add_parser("assign")
    link.add_argument("facilitator")
    link.add_argument("student")
    args = parser.parse_args()
    dsn = os.environ["DATABASE_URL"]
    if args.command == "migrate":
        migrate(dsn)
    elif args.command == "seed":
        print({"imported": seed(dsn)})
    elif args.command == "account":
        identifier, token = account(dsn, args.role)
        print(json.dumps({"account_id": identifier, "token": token}))
    elif args.command == "rotate":
        token = secrets.token_urlsafe(32)
        with psycopg.connect(dsn) as db:
            result = db.execute("UPDATE yogya_accounts SET token_hash=%s,expires_at=now()+interval '7 days' "
                                "WHERE id=%s", (hashlib.sha256(token.encode()).hexdigest(), args.account_id))
            if result.rowcount != 1:
                raise RuntimeError("Account not found")
        print(json.dumps({"account_id": args.account_id, "token": token}))
    else:
        assign(dsn, args.facilitator, args.student)
