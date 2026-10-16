"""Run portable mobile-core/backend QA in a temporary schema of an isolated test database."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request
from uuid import uuid4
import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--backend", type=Path, default=Path("yogya-backend"))
parser.add_argument("--mobile", type=Path, default=Path("yogya-mobile"))
args = parser.parse_args()
base = os.environ.get("YOGYA_INTEGRATION_DATABASE_URL")
if not base:
    raise SystemExit("Set YOGYA_INTEGRATION_DATABASE_URL to an isolated PostgreSQL test database.")
backend, mobile = args.backend.resolve(), args.mobile.resolve()
schema = "qa_" + uuid4().hex
with psycopg.connect(base, autocommit=True) as db:
    db.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
env = {**os.environ, "DATABASE_URL": make_conninfo(base, options="-csearch_path=" + schema),
       "ELIGIBILITY_SERVICE_URL": "", "SPEECH_ADAPTER_URL": ""}
process = None
try:
    for command in ("migrate", "seed"):
        subprocess.run([sys.executable, "manage.py", command], cwd=backend, env=env, check=True)
    def account():
        raw = subprocess.check_output([sys.executable, "manage.py", "account", "student"],
                                      cwd=backend, env=env, text=True)
        return json.loads(raw)["token"]
    first, second = account(), account()
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    address = "http://127.0.0.1:" + str(port)
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1",
                                "--port", str(port), "--no-access-log"],
                               cwd=backend, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ready = False
    for _ in range(100):
        if process.poll() is not None:
            break
        try:
            with urllib.request.urlopen(address + "/api/v1/health", timeout=1) as response:
                ready = response.status == 200
        except Exception:
            time.sleep(0.1)
        if ready:
            break
    if not ready:
        raise RuntimeError("The isolated QA backend did not become healthy.")
    subprocess.run(["node", str(mobile / "tests/backend-integration.test.mjs")], check=True,
                   env={**env, "YOGYA_QA_API_URL": address,
                        "YOGYA_QA_STUDENT_TOKEN": first, "YOGYA_QA_OTHER_TOKEN": second})
finally:
    if process is not None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
    with psycopg.connect(base, autocommit=True) as db:
        db.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
