import core from '../src/services/offline/core.js';
const {createOfflineStore} = core;
async function run() {
let passed = 0, id = 0, now = 1000;
function check(value, message) { if (!value) throw new Error(message); passed++; }
const values = new Map();
let failWrites = false;
const storage = {
  async getItem(k) { return values.get(k) ?? null; },
  async setItem(k, v) { if (failWrites) throw new Error('disk full'); values.set(k, v); },
};
const build = key => createOfflineStore(storage, key, () => 'op-' + (++id), () => now);
let store = build('student-a');
await store.cache('item', {id: 'item', completed: false, version: 1});
await store.enqueue('item', {completed: true}, {method: 'PATCH', path: '/item', body: {completed: true}});
await store.enqueue('item', {completed: false}, {method: 'PATCH', path: '/item', body: {completed: false}});
store = build('student-a');
let snapshot = await store.snapshot();
check(snapshot.queue.length === 2 && !snapshot.records.item.value.completed, 'Restart preserves both intents');
check(snapshot.queue[0].body.expected_version === 1 && snapshot.queue[1].body.expected_version === 2,
      'Rapid edits preserve the expected version sequence');
let server = {completed: false, version: 1}, receipts = new Map(), dropped = false;
const send = async op => {
  if (!receipts.has(op.id)) {
    check(op.body.expected_version === server.version, 'Server checks expected version');
    server = {completed: op.body.completed, version: server.version + 1};
    receipts.set(op.id, {...server});
  }
  if (!dropped) { dropped = true; throw Object.assign(new Error('Response lost'), {status: 0}); }
  return receipts.get(op.id);
};
await store.flush(send);
check((await store.snapshot()).queue.length === 2 && server.version === 2, 'Lost response preserves operation ID');
await store.retry(); await store.flush(send);
check((await store.snapshot()).queue.length === 0 && server.version === 3 && !server.completed,
      'Retry does not duplicate the accepted mutation');
await store.enqueue('item', {completed: true}, {method: 'PATCH', path: '/item', body: {completed: true}});
await store.flush(async () => { throw Object.assign(new Error(), {status: 409}); });
check((await store.snapshot()).queue[0].status === 'conflict', 'Conflict preserves local intent');
await store.enqueue('item', {completed: false}, {method: 'PATCH', path: '/item', body: {completed: false}});
let calls = 0;
await store.flush(async () => { calls++; return {version: 4}; });
check(calls === 0, 'A conflict blocks later edits of that record');
await store.useServer('item', {completed: true, version: 5});
check((await store.snapshot()).queue.length === 0, 'Explicit resolution clears conflicting intents');
failWrites = true;
let rejected = false;
try { await store.enqueue('item', {completed: false}, {method: 'PATCH', path: '/item', body: {completed: false}}); }
catch { rejected = true; }
failWrites = false;
check(rejected && (await store.snapshot()).queue.length === 0, 'Storage failure does not acknowledge a phantom write');
await store.enqueue('item', {completed: false}, {method: 'PATCH', path: '/item', body: {completed: false}});
await store.flush(async () => { throw Object.assign(new Error(), {status: 422}); });
check((await store.snapshot()).queue[0].status === 'failed', 'Validation errors do not retry forever');
await store.useServer('item', {completed: true, version: 5});
await store.enqueue('item', {completed: false}, {method: 'PATCH', path: '/item', body: {completed: false}});
await store.flush(async () => { throw Object.assign(new Error(), {status: 401}); });
check((await store.snapshot()).queue[0].status === 'pending' &&
      (await store.snapshot()).error === 'auth', 'Authentication expiry retains pending work');
check((await build('student-b').snapshot()).queue.length === 0, 'Account queues are isolated');
await store.useServer('item', {completed: true, version: 5});
await Promise.all(Array.from({length: 8}, (_, n) => store.enqueue('item', {completed: Boolean(n % 2)},
  {method: 'PATCH', path: '/item', body: {completed: Boolean(n % 2)}})));
snapshot = await store.snapshot();
check(snapshot.queue.length === 8 && snapshot.queue[7].body.expected_version === 12,
      'Concurrent local writes serialize without losing intents');
values.set('broken', 'not json');
rejected = false;
try { await build('broken').cache('x', {version: 1}); } catch { rejected = true; }
check(rejected && values.get('broken') === 'not json', 'Corruption is surfaced without discarding the queue');
await store.useServer('item', {completed: false, version: 5});
await store.enqueue('item', {completed: true}, {method: 'PATCH', path: '/item', body: {completed: true}});
for (let i = 0; i < 6; i++) {
  now += 100000;
  await store.flush(async () => { throw Object.assign(new Error(), {status: 503}); });
}
check((await store.snapshot()).queue[0].status === 'stalled', 'Transient retries are bounded');
await store.cache('new-save', {version: 0, saved: false});
await store.enqueue('new-save', {saved: true}, {method: 'POST', path: '/saved', body: {saved: true}});
check((await store.snapshot()).queue.find(op => op.entity === 'new-save').body.expected_version === 0,
      'A new saved record uses version zero');
return passed;
}
console.log('Passed offline assertions:', await run());
