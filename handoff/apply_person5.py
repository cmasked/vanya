"""Check/apply the reviewed existing-file integration patch without overwriting local work."""
import argparse
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--apply", action="store_true", help="apply after all checks pass")
args = parser.parse_args()
root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
patch = Path(__file__).resolve().with_name("person-5-existing-mobile.patch")
if not (root / "yogya-mobile/package.json").exists():
    raise SystemExit("Run this after importing the additive files into the original Yogya repository.")
for command in (["git", "diff", "--quiet"], ["git", "diff", "--cached", "--quiet"]):
    if subprocess.run(command, cwd=root).returncode:
        raise SystemExit("Preserve your tracked working-tree changes before applying the integration patch.")
subprocess.run(["git", "apply", "--check", str(patch)], cwd=root, check=True)
if args.apply:
    subprocess.run(["git", "apply", str(patch)], cwd=root, check=True)
    print("Patch applied. Review the diff, run npm install, and validate before committing.")
else:
    print("Patch applies cleanly. No files changed. Re-run with --apply to apply.")
