const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const {createScopedStorage} = require('../src/services/scopedStorage.js');
const core = require('../src/services/offline/core.js');

async function run() {
  const disk = new Map(), secrets = new Map();
  let diskFailure = false, online = true, counter = 0;
  const storage = {
    async getItem(k) {return disk.get(k) ?? null;},
    async setItem(k, v) {if (diskFailure) throw Error('disk full'); disk.set(k, v);},
    async removeItem(k) {disk.delete(k);},
  };
  const ui = createScopedStorage(storage);
  const profile = (id, name) => ({id, display_name: name, education_level: 'class_11',
    state: 'Tamil Nadu', preferred_language: 'Tamil', interests: [], version: 1,
    updated_at: '2026-01-01T00:00:00Z'});
  const accounts = {
    a: {id: 'a', role: 'student', student_id: 'student-a'},
    b: {id: 'b', role: 'student', student_id: 'student-b'},
  };
  const profiles = {'student-a': profile('student-a', 'Student A'), 'student-b': profile('student-b', 'Student B')};
  const saved = {a: {id: 'save-a', opportunity_id: 'opp-a', saved: true, version: 1}, b: null};
  const receipts = new Map(), mutations = [];
  class ApiError extends Error {constructor(message, path, status) {super(message); this.status = status;}}
  const response = (status, value) => ({ok: status < 400, status, async json() {return structuredClone(value);}});
  async function fetch(url, options = {}) {
    if (!online) throw Error('offline');
    const token = options.headers?.Authorization?.replace('Bearer ', '');
    const account = accounts[token], path = new URL(url).pathname.replace('/api/v1', '');
    const method = options.method || 'GET';
    if (path === '/health') return response(200, {status: 'ok'});
    if (!account) return response(401, {detail: 'Invalid account'});
    if (path === '/session') return response(200, account);
    if (path.startsWith('/students/') && !path.startsWith('/students/' + account.student_id))
      return response(404, {detail: 'Wrong owner'});
    if (path === '/students/' + account.student_id && method === 'GET')
      return response(200, profiles[account.student_id]);
    if (path.startsWith('/students/') && path.includes('/saved-opportunities') && method === 'GET') {
      if (path.endsWith('/saved-opportunities')) return response(200, saved[token]?.saved ? [saved[token]] : []);
      return response(200, saved[token] || {saved: false, version: 0, opportunity_id: path.split('/').at(-1)});
    }
    if (path === '/saved-opportunities/save-a/checklist')
      return response(200, [{id: 'item-a', saved_id: 'save-a', title: 'Certificate', completed: false, version: 1}]);
    const body = JSON.parse(options.body || '{}'), receipt = options.headers?.['Idempotency-Key'];
    if (receipts.has(receipt)) return response(200, receipts.get(receipt));
    if (method === 'PATCH' && path === '/students/' + account.student_id) {
      const current = profiles[account.student_id];
      if (current.version !== body.expected_version) return response(409, {detail: 'Profile conflict'});
      const value = {...current, ...body.changes, version: current.version + 1};
      profiles[account.student_id] = value; receipts.set(receipt, value); mutations.push({token, path, body});
      return response(200, value);
    }
    if (method === 'POST' && path.endsWith('/saved-opportunities')) {
      const current = saved[token];
      if (body.expected_version !== (current?.version || 0)) return response(409, {detail: 'Save conflict'});
      const value = {id: 'save-' + token, opportunity_id: body.opportunity_id,
        saved: body.saved, version: (current?.version || 0) + 1};
      saved[token] = value; receipts.set(receipt, value); mutations.push({token, path, body});
      return response(200, value);
    }
    throw Error('Unhandled request: ' + method + ' ' + path);
  }
  const modules = {
    'expo-file-system': {File: class {}},
    'expo/fetch': {fetch},
    '@react-native-async-storage/async-storage': storage,
    'expo-crypto': {CryptoDigestAlgorithm: {SHA256: 'sha256'},
      digestStringAsync: async (_, value) => crypto.createHash('sha256').update(value).digest('hex'),
      randomUUID: () => '00000000-0000-4000-8000-' + String(++counter).padStart(12, '0')},
    'expo-secure-store': {
      getItemAsync: async k => secrets.get(k) || null,
      setItemAsync: async (k, v) => {secrets.set(k, v);},
      deleteItemAsync: async k => {secrets.delete(k);}},
    'expo-network': {getNetworkStateAsync: async () => ({isConnected: online, isInternetReachable: online}),
      addNetworkStateListener: () => ({remove() {}})},
    'react-native': {Platform: {OS: 'android'}, AppState: {addEventListener: () => ({remove() {}})}},
    './api': {ApiError, getApiBaseUrl: () => 'https://api.example'},
    './offline/core.js': core,
    './storage': {storageService: ui},
    './catalog': {opportunityService: {fetchOpportunityById: async () => ({data: null})}},
  };
  const module = {exports: {}};
  const compiled = ts.transpileModule(fs.readFileSync('src/services/integration.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText;
  const context = {module, exports: module.exports, require: name => {
    if (!(name in modules)) throw Error('Unexpected module ' + name);
    return modules[name];
  }, fetch, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
    __DEV__: false, console, URL, Date};
  vm.runInNewContext(compiled, context);
  const api = module.exports;

  await ui.saveProfile({id: 'guest', displayName: 'Guest Draft', educationLevel: 'Class 9', state: 'Kerala', interests: []});
  await api.connect('a');
  assert.equal((await ui.getProfile()).displayName, 'Student A');
  assert.deepEqual(await ui.getSavedOpportunityIds(), ['opp-a']);
  await api.connect('b');
  assert.equal((await ui.getProfile()).displayName, 'Student B');
  assert.deepEqual(await ui.getSavedOpportunityIds(), []);
  await assert.rejects(api.connect('invalid'));
  assert.equal((await ui.getProfile()).displayName, 'Student B');
  await api.connect('a');
  assert.equal((await ui.getProfile()).displayName, 'Student A');

  // A fresh server unsave must not be overwritten just by opening preparation.
  saved.a = {...saved.a, saved: false, version: 2};
  await assert.rejects(api.prepareChecklist('opp-a'), /Save this opportunity/);
  assert.equal(saved.a.saved, false);
  assert.equal(mutations.length, 0);

  online = false;
  await api.syncProfile({...await ui.getProfile(), displayName: 'Offline A'});
  assert.equal((await ui.getProfile()).displayName, 'Offline A');
  assert.equal((await api.getStatus()).state.queue.length, 1);
  assert.equal(profiles['student-a'].display_name, 'Student A');
  online = true;
  await api.connect('b');
  assert.equal((await ui.getProfile()).displayName, 'Student B');
  assert.equal(profiles['student-b'].display_name, 'Student B');
  await api.connect('a');
  assert.equal((await ui.getProfile()).displayName, 'Offline A');
  await api.flush();
  assert.equal(profiles['student-a'].display_name, 'Offline A');
  assert.equal((await api.getStatus()).state.queue.length, 0);

  await api.disconnect();
  assert.equal((await ui.getProfile()).displayName, 'Guest Draft');
  await api.connect('b');
  assert.equal((await ui.getProfile()).displayName, 'Student B');
  diskFailure = true;
  await assert.rejects(ui.saveProfile({...await ui.getProfile(), displayName: 'Not durable'}));
  diskFailure = false;
  assert.equal((await ui.getProfile()).displayName, 'Student B');
  const corruptKey = '@yogya.ui.' + ui.getScope() + '.profile';
  disk.set(corruptKey, 'bad JSON');
  await assert.rejects(ui.getProfile(), /preserved/);
  assert.equal(disk.get(corruptKey), 'bad JSON');

  // Writes queued before an account switch retain their original destination.
  const isolated = createScopedStorage(storage);
  isolated.setScope('a');
  const pending = isolated.saveSavedOpportunityIds(['only-a']);
  isolated.setScope('b');
  await pending;
  assert.deepEqual(await isolated.getSavedOpportunityIds(), []);
  isolated.setScope('a');
  assert.deepEqual(await isolated.getSavedOpportunityIds(), ['only-a']);
  console.log('Account integration passed: switching, hydration, offline edits, conflict protection, durable storage and corruption recovery.');
}
run().catch(error => {console.error(error); process.exitCode = 1;});
