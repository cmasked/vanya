# Person 5 full-project branch

This branch contains the complete upstream application and the Person 5 additions.
The existing-screen integration changes have already been applied.
The retained patch records those edits for provenance and review.

Run npm ci in yogya-mobile after the generated dependency lock has been committed
by the full-project workflow. Use npm run typecheck and npm run test:offline.
See yogya-mobile/PERSON_5.md and docs/WORKING_REPOSITORY.md for configuration,
offline behavior, privacy limits and device tests.

The full HTTP QA runner requires the Person 2 backend. Both modules are available
together on integration/yogya-complete.
