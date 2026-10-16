# Yogya team handoff

This repository stages two independent contributions for
[Foxtrot81/Yogya-AI-Powered-Oppurtunity-Navigator](https://github.com/Foxtrot81/Yogya-AI-Powered-Oppurtunity-Navigator).

- `person-2/backend`: FastAPI/PostgreSQL backend, migration and seed tooling, tests, and integration notes.
- `person-5/voice-offline-sync`: mobile voice/offline services, tests, and a checked patch for existing mobile files.

The implementation lives on the role branches. Their handoff notes describe how to
review and cherry-pick only the contribution commit into the Yogya repository.
Do not merge unrelated repository histories or copy this README over Yogya's README.

Source baseline inspected: `4049a401d53b4b9624fab705d250ae66fede0be8`.
External eligibility and speech services require separate configuration.
