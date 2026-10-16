# Person 5 voice, offline and integration
This full-project branch already contains the upstream mobile app and the existing-file
integration changes. The server is on person-2/full-project; both contributions are
integrated on integration/yogya-complete.

From yogya-mobile:
    npm install
    npm run typecheck
    npm run test:offline
    npx expo install --check
    npx expo start
The full-project workflow resolves dependencies, runs checks and commits the tested
package-lock.json on this branch. Subsequent installs can use npm ci.
Native dependencies use Expo's SDK 57 manifest:
https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json

Set EXPO_PUBLIC_API_URL in .env (no /api/v1 suffix). Android emulator uses
http://10.0.2.2:8000; a physical phone uses the development machine's reachable
LAN address or HTTPS deployment. Deployed builds require HTTPS.
Never put speech credentials or a shared administrative token in EXPO_PUBLIC variables.

Backend setup: follow yogya-backend/README.md. Provision a separate student token
with the trusted account CLI. Open Profile > Voice & sync, enter that token,
then tap Sync this profile. On native, only the credential/session metadata is in
Expo SecureStore. Browser tokens remain in memory and require reconnecting after reload.

VoiceInput provides a replaceable VoiceProvider, microphone permission handling,
record/stop/cancel, a 30-second recording limit, editable transcripts, text fallback,
language selection (English/Tamil), and on-device speech playback with voice checks.
The accepted transcript populates the preferred-name draft for review in onboarding.
ReadinessPanel can read document titles and eligibility explanations aloud.
This does not translate English scheme text into Tamil; translated explanations
remain Person 3's responsibility. English/Tamil labels are in integrationStrings.ts.
Speech recognition needs a configured server speech adapter; there is no fabricated
transcript, bundled secret, or claimed tested BHASHINI integration.
The chosen adapter must support the device's AAC/MP4 or browser WebM recording.
Audio stays temporary and is deleted after upload/cancel. A process crash may leave
an OS-managed cache file until reclamation. Never enable background recording.

The existing AsyncStorage profile/bookmark implementation is preserved. Durable
server catalog caching adds original fetch timestamps and source verification dates.
Saved items hydrate before the saved-screen registry resolves. Cached listings have
a distinct data-source label; stale dates are not presented as newly verified.
Demo opportunity IDs remain local and are never synchronized as verified records.

In an opportunity, tap Save and prepare checklist once online to load its actual
document requirements. After that, checklist reads and updates work offline and
survive restart. Eligibility explanations previously returned by Person 3 are cached.
Profile updates and real bookmarks are queued after account/profile linking.
The original local-only profile remains usable without linking a server account.

One serialized AsyncStorage snapshot per server/account contains records plus
pending operations. A local mutation and its operation are persisted together.
Server operations retain their UUID and payload on retries. Expected versions are
predicted for rapid sequential edits; a conflict blocks later edits of that record.
Transient errors use bounded exponential backoff; validation errors stop retries;
expired authentication retains pending changes. Foreground/network events trigger
sync, with a backend health probe separate from Wi-Fi connectivity.
There is no promise of background execution while Android suspends the app.

Voice & sync shows pending/failed operations. Review a conflict, explicitly choose
the server version, then re-enter any desired edit. New server data never silently
overwrites queued local changes. Disconnect removes the token but retains the
account-scoped queue so the same account can recover its pending work.
AsyncStorage records are NOT encrypted. Retain only necessary guidance/profile
fields on a trusted demo device. A multi-user/shared-device privacy policy and
cache-deletion UI need separate product decisions.

Manual device checks (not executed in the preparation environment):
1. Provision account, link profile, fetch real opportunities, check eligibility.
2. Save/prepare an opportunity and load its checklist.
3. Disable connectivity, restart, open saved details, toggle checklist items.
4. Restart again; confirm local values and pending operations survive.
5. Reconnect; confirm server versions/completion and pending count.
6. Drop a response after server acceptance; confirm retry has one effect.
7. Change an item from another authorized device; confirm 409 and explicit resolution.
8. Deny microphone permission, cancel while starting/recording/uploading, repeat taps.
9. Verify English/Tamil installed voices, missing voices and an unavailable adapter.
10. Test server downtime, disk-full persistence failure, expired tokens and wrong account.

Verification: 17 assertions against the portable queue core were executed in a V8
JavaScript isolate. The shipped Node test contains those same assertions.
Node queue assertions, TypeScript and Expo dependency checks subsequently passed
in GitHub-hosted CI against the exact upstream snapshot. The local cloud shell is
still unavailable. A real HTTP core/backend QA runner is included in handoff/;
consult the latest branch Actions result. Actual speech, native Android and the
complete device demonstration still require device/provider validation.

Latest observed CI result: all configured checks, including real HTTP core/backend
synchronization QA, passed on abb6380bf70880328536ed4f78d35ec5c85aa20c.
Evidence: https://github.com/cmasked/vanya/actions/runs/38938017410

## Audit corrections
Profiles and bookmarks now follow the active server/account scope. Connect the intended
student before onboarding; connecting an existing student loads their server profile.
Guest drafts stay separate. Read [the audit](../docs/IMPLEMENTATION_AUDIT.md) for migration
behavior, remaining dependencies and test limits. Run `node tests/account-integration.test.cjs`
from yogya-mobile for the actual integration-service regression test with mocked native APIs.
