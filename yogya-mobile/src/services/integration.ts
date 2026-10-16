import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';
import { ApiError, getApiBaseUrl } from './api';
import { createOfflineStore, type OfflineStore, type Operation, type Value } from './offline/core.js';
import type { StudentProfile } from '@/types';

type Session = {id: string; role: string; student_id: string | null; token: string; origin: string};
let session: Session | null = null, queue: OfflineStore | null = null;
let restoring: Promise<void> | undefined;
let abortSession = new AbortController();
const TOKEN_KEY = 'yogya.session.v1';
export let networkLabel = 'Not connected';

function origin() {
  const url = getApiBaseUrl();
  if (!url) throw new Error('Set EXPO_PUBLIC_API_URL to connect.');
  if (!__DEV__ && !url.startsWith('https://')) throw new Error('Use HTTPS for deployed services.');
  return url;
}
export async function request<T = Value>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const outer = options.signal;
  const identitySignal = abortSession.signal;
  outer?.addEventListener('abort', cancel);
  identitySignal.addEventListener('abort', cancel);
  if (outer?.aborted || identitySignal.aborted) cancel();
  const timer = setTimeout(cancel, 30000);
  try {
    if (session && session.origin !== origin()) throw new Error('Reconnect for this server.');
    const response = await fetch(origin() + '/api/v1' + path, {
      ...options, signal: controller.signal,
      headers: {Accept: 'application/json', 'Content-Type': 'application/json',
        ...(session ? {Authorization: 'Bearer ' + session.token} : {}), ...options.headers}});
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.detail || 'Request could not be completed', path, response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Server is unavailable. Saved changes remain on this device.', path);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', cancel);
    identitySignal.removeEventListener('abort', cancel);
  }
}
async function install(value: Session) {
  abortSession.abort(); abortSession = new AbortController();
  session = value;
  const namespace = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value.origin);
  queue = createOfflineStore(AsyncStorage, '@yogya.sync.' + namespace + '.' + value.id, Crypto.randomUUID);
}
export async function restore() {
  if (!restoring) restoring = (async () => {
    if (Platform.OS === 'web') return; // Browser tokens are intentionally memory-only.
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return;
    const value = JSON.parse(raw) as Session;
    if (value.origin === getApiBaseUrl()) await install(value);
  })().catch(error => { restoring = undefined; throw error; });
  await restoring;
}
export async function connect(token: string) {
  await restore();
  const previous = session;
  // Verify the new credential before persisting it or changing the active queue.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(origin() + '/api/v1/session', {
      headers: {Authorization: 'Bearer ' + token.trim()}, signal: controller.signal});
    if (!response.ok) throw new Error('Could not authenticate this student account.');
    const value = await response.json();
    if (typeof value.id !== 'string' || value.role !== 'student') throw new Error('Use a student account token.');
    const next = {...value, token: token.trim(), origin: origin()} as Session;
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(next));
    await install(next);
    return next;
  } catch (error) {
    session = previous;
    throw error;
  } finally { clearTimeout(timer); }
}
export async function disconnect() {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY);
  abortSession.abort(); abortSession = new AbortController();
  session = null; queue = null;
  // Pending account-scoped data is retained for recovery with the same account.
}
async function current() {
  await restore();
  if (!session || !queue) throw new Error('Connect a student account in Voice & sync.');
  return {account: session, store: queue};
}
const profileData = (p: StudentProfile) => ({
  display_name: p.displayName, education_level: ({'Class 9': 'class_9', 'Class 10': 'class_10',
    'Class 11': 'class_11', 'Class 12': 'class_12', 'Diploma': 'diploma',
    'Undergraduate': 'undergraduate'} as Record<string, string>)[p.educationLevel] || p.educationLevel, state: p.state,
  preferred_language: p.preferredLanguage, district: p.district || null,
  course_or_stream: p.stream || null, institution_type: p.institutionType || null,
  main_goal: p.mainGoal || null, interests: p.interests,
});
export async function syncProfile(profile: StudentProfile, initial = false) {
  await restore();
  if (!initial && !session) return;
  const {account, store} = await current();
  if (!account.student_id) {
    const info = await request('/session');
    account.student_id = info.student_id;
  }
  if (!account.student_id) {
    const created = await request('/students', {method: 'POST',
      headers: {'Idempotency-Key': Crypto.randomUUID()}, body: JSON.stringify(profileData(profile))});
    account.student_id = created.id;
    await store.cache('profile:' + created.id, created);
  } else {
    const entity = 'profile:' + account.student_id;
    const cached = (await store.snapshot()).records[entity];
    if (!cached) await store.cache(entity, await request('/students/' + account.student_id));
    const changes = profileData(profile);
    await store.enqueue(entity, changes, {method: 'PATCH',
      path: '/students/' + account.student_id, body: {changes}});
  }
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(account));
  await flush();
}
export async function flush() {
  const {account, store} = await current();
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false || state.isInternetReachable === false) {
    networkLabel = 'Offline'; return;
  }
  try { await request('/health'); } catch { networkLabel = 'Server unavailable'; return; }
  networkLabel = 'Connected';
  await store.flush(async (op: Operation) => {
    if (session !== account) throw new ApiError('Connect the original account to sync.', op.path, 401);
    return request(op.path, {method: op.method, headers: {'Idempotency-Key': op.id},
      body: JSON.stringify(op.body)});
  });
}
export async function getStatus() {
  await restore();
  return {connected: Boolean(session), studentId: session?.student_id,
    state: queue ? await queue.snapshot() : null, network: networkLabel};
}
export async function retry() { const {store} = await current(); await store.retry(); await flush(); }
export async function prepareChecklist(opportunityId: string) {
  const {account, store} = await current();
  if (!account.student_id) throw new Error('Sync your profile first in Voice & sync.');
  const listKey = 'list:' + opportunityId;
  try {
    const network = await Network.getNetworkStateAsync();
    if (network.isConnected === false || network.isInternetReachable === false) throw new Error('Offline');
    const saved = await request('/students/' + account.student_id + '/saved-opportunities', {
      method: 'POST', headers: {'Idempotency-Key': Crypto.randomUUID()},
      body: JSON.stringify({opportunity_id: opportunityId})});
    const items = await request<Value[]>('/saved-opportunities/' + saved.id + '/checklist');
    for (const item of items) await store.cache('item:' + item.id, item);
    await store.cache(listKey, {ids: items.map(item => item.id)});
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    if (!(await store.snapshot()).records[listKey]) throw error;
  }
  return readChecklist(opportunityId);
}
export async function readChecklist(opportunityId: string) {
  const {store} = await current(), state = await store.snapshot();
  const list = state.records['list:' + opportunityId];
  if (!list) return [];
  return (list.value.ids as string[]).map(id => ({
    ...state.records['item:' + id].value,
    pending: state.queue.some(op => op.entity === 'item:' + id),
    conflict: state.queue.some(op => op.entity === 'item:' + id && op.status === 'conflict'),
  }));
}
export async function setChecklistItem(id: string, completed: boolean) {
  const {store} = await current();
  await store.enqueue('item:' + id, {completed}, {
    method: 'PATCH', path: '/checklist-items/' + id, body: {completed}});
  void flush().catch(() => {}); // Local persistence already succeeded.
}
export async function reloadServer(entity: string) {
  const {store} = await current(), state = await store.snapshot();
  const op = state.queue.find(o => o.entity === entity);
  if (!op) return;
  await store.useServer(entity, await request(op.getPath || op.path));
}
export async function eligibility(opportunityId: string) {
  const {account, store} = await current();
  const key = 'eligibility:' + opportunityId;
  try {
    const value = await request('/eligibility/check', {method: 'POST',
      body: JSON.stringify({student_id: account.student_id, opportunity_id: opportunityId})});
    await store.cache(key, value);
    return {value, cached: false, fetchedAt: Date.now()};
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    const old = (await store.snapshot()).records[key];
    if (!old) throw error;
    return {value: old.value, cached: true, fetchedAt: old.fetchedAt};
  }
}
export function startSync() {
  const run = () => { void flush().catch(() => {}); };
  const network = Network.addNetworkStateListener(run);
  const app = AppState.addEventListener('change', state => { if (state === 'active') run(); });
  const timer = setInterval(run, 15000);
  run();
  return () => { network.remove(); app.remove(); clearInterval(timer); };
}

export async function uploadAudio(uri: string, language: string, signal: AbortSignal) {
  const {account} = await current();
  if (account.origin !== origin()) throw new Error('Reconnect for this server.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const identity = abortSession.signal;
  signal.addEventListener('abort', cancel); identity.addEventListener('abort', cancel);
  if (signal.aborted || identity.aborted) cancel();
  const timer = setTimeout(cancel, 30000);
  try {
    const body = Platform.OS === 'web' ? await (await fetch(uri)).blob() : new File(uri);
    if (body.size > 8 * 1024 * 1024) throw new Error('Recording is too large. Try a shorter answer.');
    const response = await expoFetch(origin() + '/api/v1/voice/transcribe?language=' +
      encodeURIComponent(language), {method: 'POST', body, signal: controller.signal,
      headers: {Authorization: 'Bearer ' + account.token,
        'Content-Type': Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4'}});
    if (!response.ok) throw new Error('Speech service is unavailable. Please type your answer.');
    const result = await response.json();
    if (typeof result.text !== 'string' || result.language !== language) throw new Error('Invalid transcript.');
    return result.text as string;
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', cancel);
    identity.removeEventListener('abort', cancel);
  }
}

export async function readEligibility(opportunityId: string) {
  const {store} = await current();
  const record = (await store.snapshot()).records['eligibility:' + opportunityId];
  return record ? {value: record.value, cached: true, fetchedAt: record.fetchedAt} : null;
}

export async function syncBookmark(opportunityId: string, saved: boolean) {
  await restore();
  if (!session || !queue || !session.student_id || opportunityId.startsWith('demo-')) return;
  const {account, store} = await current(), entity = 'save:' + opportunityId;
  const path = '/students/' + account.student_id + '/saved-opportunities';
  const getPath = path + '/' + encodeURIComponent(opportunityId);
  if (!(await store.snapshot()).records[entity]) {
    let value;
    try {
      const network = await Network.getNetworkStateAsync();
      if (network.isConnected === false || network.isInternetReachable === false)
        throw new Error('Offline');
      value = await request(getPath);
    }
    catch (error) {
      if (error instanceof ApiError && error.status && error.status < 500) throw error;
      value = {opportunity_id: opportunityId, saved: false, version: 0};
    }
    await store.cache(entity, value);
  }
  await store.enqueue(entity, {saved}, {method: 'POST', path, getPath,
    body: {opportunity_id: opportunityId, saved}});
  void flush().catch(() => {});
}
