# Working in cmasked/vanya

This repository contains the complete Yogya codebase and the team's additional backend
and voice/offline work. Source files, assets, licenses and Git history were imported
from Foxtrot81/Yogya-AI-Powered-Oppurtunity-Navigator.

## Full-project branches
- integration/yogya-complete: complete upstream application plus Person 2 and Person 5.
- person-2/full-project: complete upstream application plus the backend contribution.
- person-5/full-project: complete upstream application plus voice/offline integration.

## Preserved branches
- upstream/foxtrot-main is an exact copy of source main at 4049a401d53b4b9624fab705d250ae66fede0be8.
- upstream/foxtrot-mobile-frontend preserves source feature/yogya-mobile-frontend
  at fd7a8992a5429de13be20e79b9b8ee17b51ac057.
- person-2/backend and person-5/voice-offline-sync retain the earlier additive handoff packages.
- main retains the original handoff README; this migration publishes working code on branches.

## Start working
```sh
git clone --branch integration/yogya-complete https://github.com/cmasked/vanya.git
cd vanya
git switch -c feature/YOUR_TASK
```
Create feature branches from the complete integration branch and use pull requests
to share changes. The full-project role branches already contain the upstream app;
their included handoff patch is a provenance artifact and has already been applied
where Person 5 is integrated.

Backend setup: yogya-backend/README.md, when present.
Mobile setup: yogya-mobile/README.md and yogya-mobile/PERSON_5.md, when present.
The data pipeline remains in yogya-data with its original source references.

## Configuration and verification
Use per-developer .env files and individual prototype student tokens. Real provider
credentials are not included. Person 3's eligibility service and a speech adapter
need separate configuration. Device microphone/audio and Android flows still need
physical-device or emulator validation.

The full-project workflow runs the original data tests, applicable backend tests,
mobile TypeScript/Expo checks and available queue/HTTP integration checks. It can
commit only a tested generated package-lock.json on the three project branches.
See Actions for the observed result for each source revision.
