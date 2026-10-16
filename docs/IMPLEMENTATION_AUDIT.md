# Implementation audit

Scope: current combined project in cmasked/vanya/main. This is a prototype, not a fully completed product.
Review started from commit 1a03bdd5baad802415d0a8cd038444ca90615d4e. The review used repository reads and
GitHub Actions because the local execution workspace is unavailable.

## Defects addressed
1. Visible student profiles/bookmarks shared a device-global key despite account-specific sync queues.
   UI storage now uses server/account namespaces, restores before mounting screens, and reloads on identity changes.
   Connecting an existing account hydrates its profile/bookmarks. Guest drafts remain separate.
2. Checklist preparation posted an unversioned save that could resurrect a newer unsave.
   Preparation now uses the versioned queue and reads the confirmed saved record. Backend rejects unversioned changes to an existing save.
3. The frontend displayed green education/location checks without evaluating rules.
   The misleading self-check has been removed; real eligibility results come from the configured engine.
4. Missing deadlines appeared as "Open / Ongoing", cached details claimed a direct retrieval,
   and one demo record was marked verified. These claims have been corrected; official source links are visible.
5. The profile contract rejected canonical dataset fields and did not map education/age/disability names.
   Canonical eligibility attributes are validated and passed to the external engine with current_education_level.
   Historical age/disability aliases remain accepted. No completed qualification is inferred from the current class.
6. Negative income, impossible percentages, boolean/string numeric inputs and oversized attribute strings were accepted.
   Typed attributes now reject these. Engine output rejects unknown criteria and ungrounded source references;
   source references are populated from curated evidence.
7. A remote failure could leave a durably saved profile invisible; corrupt UI records were deleted.
   Local save success now remains visible, synchronization failure is reported, and corrupt records are preserved.
8. Cached opportunity details could mask an explicit server 404. Permanent client errors now retain the server outcome.
9. Account switches during queued UI writes could send old screen state to the newly active account.
   Mutations capture the storage identity and fail when it changes.

10. Eligibility could be checked against an older server profile while local edits were pending.
    Checks now require those edits to sync, and cached results identify a changed profile using server versions.

## Completion by role
| Role | Present | Still needed |
|---|---|---|
| Person 1 | Onboarding, profile, catalog, saved/detail screens; integration controls | Facilitator screens; full interface localization; scheme-specific missing-information input workflow |
| Person 2 | PostgreSQL migrations, scoped prototype authentication, APIs, deterministic service boundary, versioned writes | Production identity/recovery/rate limiting if deploying beyond the controlled prototype |
| Person 3 | External request/response contract and validation | Actual eligibility engine, natural-language extraction, ranking, explanations, personalized learning/alternative pathways |
| Person 4 | Fourteen curated records, importer, source/evidence schema and data tests | Independently verify current rules/statuses and completeness of every record against specific official documents |
| Person 5 | Voice capture UI, editable text, device TTS, authenticated speech boundary, persistence and offline queue | Actual configured speech-provider adapter and provider testing; Android microphone/audio and full real-device demo |

## Data reliability findings
The imported records say "verified", but that is a dataset label, not an independent verification performed by this audit.
For example, the Begum Hazrat Mahal entry references ministry homepages for excerpts and a 2025-2026 window;
its structured criteria omit the education range stated in its description/education metadata.
Person 4 and Person 3 must reconcile these before claiming complete eligibility decisions.
The current relational criterion schema has condition_type but no explicit nested AND/OR groups or exceptions;
a versioned schema/engine contract is needed before importing rules that require those constructs.
No scholarship rules, dates or benefit amounts were invented or silently rewritten during this audit.

## Account and offline behavior
Connect the intended account in Profile > Voice & sync before entering account-specific profile data.
Existing server profiles are loaded for that account. A new account starts with a separate profile draft.
The pre-existing device profile remains the guest draft; it is not automatically uploaded to another student.
Disconnect retains each account's pending queue for recovery with the same account. It does not erase server records.
A new profile needs the server for its first creation; previously loaded profile/checklist edits can queue offline.
UI records and queue snapshots use AsyncStorage and are not encrypted at rest. Tokens use SecureStore on native devices;
web tokens are memory-only. Protect the device and avoid unnecessary sensitive information.
If initial profile creation/sync fails, use Sync profile after reconnecting; the UI reports the local save separately.

## Validation
CI runs the original data suite, PostgreSQL-backed API tests, TypeScript, Expo dependency compatibility,
portable queue regressions, a mocked-platform test of the actual TypeScript integration service, and real HTTP queue/backend QA.
The account test covers account switching, server hydration, expired/invalid credentials, offline profile edits,
version-safe checklist preparation, write failures, corruption retention and writes racing identity changes.
Mocked-platform tests do not establish native device behavior or provider correctness.
See GitHub Actions for the result of the exact commit being reviewed.
