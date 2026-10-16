import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import core from '../src/services/offline/core.js';
const {createOfflineStore} = core;
const base = process.env.YOGYA_QA_API_URL;
const token = process.env.YOGYA_QA_STUDENT_TOKEN;
const stranger = process.env.YOGYA_QA_OTHER_TOKEN;
if (!base || !token || !stranger) throw new Error('Run through handoff/run_integration_qa.py');
async function api(path, {method = 'GET', body, key, credential = token} = {}) {
  const response = await fetch(base + '/api/v1' + path, {
    method, headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + credential,
      ...(key ? {'Idempotency-Key': key} : {})}, body: body ? JSON.stringify(body) : undefined});
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.detail), {status: response.status});
  return value;
}
const profile = await api('/students', {method: 'POST', key: randomUUID(),
  body: {display_name: 'QA Student', education_level: 'class_11', state: 'Tamil Nadu'}});
const catalog = await api('/opportunities?type=scholarship');
assert.ok(catalog.items.length > 0);
const saved = await api('/students/' + profile.id + '/saved-opportunities', {
  method: 'POST', key: randomUUID(), body: {opportunity_id: catalog.items[0].id}});
const items = await api('/saved-opportunities/' + saved.id + '/checklist');
assert.ok(items.length > 0);
const item = items[0], path = '/checklist-items/' + item.id;
const values = new Map();
const disk = {async getItem(k) {return values.get(k) ?? null;},
  async setItem(k, v) {values.set(k, v);}};
const build = () => createOfflineStore(disk, 'qa-student', randomUUID);
let queue = build();
await queue.cache(item.id, item);
await queue.enqueue(item.id, {completed: true}, {method: 'PATCH', path, body: {completed: true}});
await queue.flush(async () => {throw Object.assign(new Error('offline'), {status: 0});});
queue = build(); // Restart the client while disconnected.
assert.equal((await queue.snapshot()).records[item.id].value.completed, true);
assert.equal((await queue.snapshot()).queue.length, 1);
assert.equal((await api(path)).completed, false);
await queue.retry();
let responseLost = false;
const send = async op => {
  const value = await api(op.path, {method: op.method, body: op.body, key: op.id});
  if (!responseLost) {responseLost = true; throw Object.assign(new Error('response lost'), {status: 0});}
  return value;
};
await queue.flush(send);
assert.equal((await api(path)).version, 2); // The server accepted the first request.
queue = build(); // Crash before acknowledgement was persisted.
await queue.retry();
await queue.flush(send);
assert.equal((await api(path)).version, 2); // Exact receipt replay, not a duplicate effect.
assert.equal((await queue.snapshot()).queue.length, 0);
await queue.enqueue(item.id, {completed: false}, {method: 'PATCH', path, body: {completed: false}});
await api(path, {method: 'PATCH', key: randomUUID(), body: {completed: true, expected_version: 2}});
await queue.flush(async op => api(op.path, {method: op.method, body: op.body, key: op.id}));
assert.equal((await queue.snapshot()).queue[0].status, 'conflict');
assert.equal((await queue.snapshot()).records[item.id].value.completed, false);
assert.equal((await api(path)).completed, true); // A conflict did not overwrite the newer server value.
await queue.useServer(item.id, await api(path));
await queue.enqueue(item.id, {completed: false}, {method: 'PATCH', path, body: {completed: false}});
await queue.flush(async op => api(op.path, {method: op.method, body: op.body, key: op.id}));
assert.equal((await api(path)).version, 4);
assert.equal((await api(path)).completed, false);
assert.equal((await queue.snapshot()).queue.length, 0);
await assert.rejects(api(path, {credential: stranger}), e => e.status === 404);
await assert.rejects(api(path, {method: 'PATCH', credential: stranger, key: randomUUID(),
  body: {completed: true, expected_version: 4}}), e => e.status === 404);
const eligibility = await api('/eligibility/check', {method: 'POST',
  body: {student_id: profile.id, opportunity_id: catalog.items[0].id}});
assert.equal(eligibility.status, 'POTENTIAL_MATCH_NEEDS_INFO');
assert.equal(eligibility.student_id, profile.id);
assert.equal(eligibility.opportunity_id, catalog.items[0].id);
assert.ok(eligibility.criteria.length > 0);
assert.ok(eligibility.criteria.every(item =>
  ['SATISFIED', 'NOT_SATISFIED', 'UNKNOWN', 'REQUIRES_VERIFICATION'].includes(item.status)));
assert.ok(eligibility.explanation.summary);
assert.ok(eligibility.checklist.length > 0);
console.log('Core/backend integration passed: restart, offline replay, lost response, idempotency, conflict and authorization.');
