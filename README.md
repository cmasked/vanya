# Yogya — complete working project

This is the full project in **[cmasked/vanya](https://github.com/cmasked/vanya)**.
It includes the complete original mobile app/data pipeline plus Person 2's backend
and Person 5's integrated voice/offline/synchronization work.

## Start here
```sh
git clone --branch integration/yogya-complete https://github.com/cmasked/vanya.git
cd vanya
```

- [Repository and branch guide](docs/WORKING_REPOSITORY.md)
- [Backend setup, database migrations and API](yogya-backend/README.md)
- [Mobile setup](yogya-mobile/README.md)
- [Voice, offline behavior, synchronization and device checks](yogya-mobile/PERSON_5.md)
- [Opportunity data pipeline](yogya-data/README.md)
- [Original upstream README](docs/UPSTREAM_README.md)
- [Source provenance](REPOSITORY_PROVENANCE.json)

## Full-project branches
- `integration/yogya-complete`: both roles integrated; recommended starting point for team work.
- `person-2/full-project`: complete upstream project plus the backend.
- `person-5/full-project`: complete upstream project plus voice/offline integration.

The `upstream/foxtrot-*` branches preserve the original source history and trees.
Earlier additive handoff branches are retained. `main` is preserved; all full-project
branches share its ancestry and can be reviewed/merged using normal Git workflows.

## Running the backend
With Python 3.12+, PostgreSQL, and a local `yogya-backend/.env` configured:
```sh
python -m pip install -r yogya-data/requirements.txt -r yogya-backend/requirements.txt
cd yogya-backend
python manage.py migrate
python manage.py seed
python manage.py account student
uvicorn main:app --host 0.0.0.0 --port 8000
```
Use the generated individual student token in Profile > Voice & sync, then sync
the student profile. Never commit that token or other credentials.

## Running the mobile app
Set `EXPO_PUBLIC_API_URL` in `yogya-mobile/.env` to the backend address reachable
from the device, then:
```sh
cd yogya-mobile
npm ci
npx expo start
```
The checked-in lockfile is generated and validated by CI. Physical phones require
a reachable LAN address or HTTPS server; localhost points to the phone itself.

## Validation and remaining dependencies
GitHub Actions runs the original data pipeline tests, PostgreSQL backend tests,
queue regression assertions, TypeScript/Expo compatibility and real HTTP queue-to-
backend synchronization checks. See the branch's Actions result for observed status.

Configure Person 3's eligibility service and an actual speech adapter for live
eligibility and speech recognition. Missing services return explicit unavailable
responses. Android microphone/audio and the full real-device demonstration still
need device testing. Checklist completion does not submit an application.
