import AsyncStorage from '@react-native-async-storage/async-storage';
import { opportunityService as server } from './opportunities';
import { getApiBaseUrl } from './api';
import type { Opportunity, OpportunitiesResult, OpportunityDetailResult } from '@/types';

type Catalog = {items: Record<string, {value: Opportunity; fetchedAt: string}>;
  lists: Record<string, {ids: string[]; fetchedAt: string}>};
let cached: Catalog | null = null;
let serial: Promise<unknown> = Promise.resolve();
const key = () => '@yogya.catalog.v1:' + (getApiBaseUrl() || 'demo');
const memory = new Map<string, Opportunity>();
async function read(): Promise<Catalog> {
  if (cached) return cached;
  const raw = await AsyncStorage.getItem(key());
  cached = raw ? JSON.parse(raw) as Catalog : {items: {}, lists: {}};
  if (!cached.items || !cached.lists) throw new Error('Cached catalog needs recovery.');
  for (const [id, item] of Object.entries(cached.items)) memory.set(id, item.value);
  return cached;
}
async function save(items: Opportunity[], query?: string) {
  const job = serial.then(async () => {
    const next: Catalog = JSON.parse(JSON.stringify(await read()));
    const fetchedAt = new Date().toISOString();
    for (const item of items) {
      next.items[item.id] = {value: item, fetchedAt};
    }
    if (query !== undefined) next.lists[query] = {ids: items.map(i => i.id), fetchedAt};
    await AsyncStorage.setItem(key(), JSON.stringify(next)); cached = next;
    for (const item of items) memory.set(item.id, item);
  });
  serial = job.catch(() => {});
  await job;
}
export const opportunityService = {
  hydrateCache: read,
  getCachedOpportunity(id: string) { return memory.get(id) || server.getCachedOpportunity(id); },
  async fetchOpportunities(params?: {type?: string; search?: string}): Promise<OpportunitiesResult> {
    const result = await server.fetchOpportunities(params);
    const query = JSON.stringify({type: params?.type || 'all', search: params?.search?.trim() || ''});
    if (result.source === 'server') {
      try { await save(result.data, query); }
      catch { return {...result, error: 'Could not save this catalog on the device.'}; }
      return result;
    }
    try {
      const cache = await read(), list = cache.lists[query];
      if (list) return {data: list.ids.map(id => cache.items[id].value), source: 'cache',
        isMockFallback: false, error: 'Saved copy from ' + list.fetchedAt + '. Check official deadlines.'};
    } catch { /* The live/demo result remains available if only the public cache is corrupt. */ }
    return result;
  },
  async fetchOpportunityById(id: string): Promise<OpportunityDetailResult> {
    const result = await server.fetchOpportunityById(id);
    if (result.source === 'server' && result.data) {
      try { await save([result.data]); }
      catch { return {...result, error: 'Could not save this opportunity on the device.'}; }
      return result;
    }
    if (result.errorStatus && result.errorStatus >= 400 && result.errorStatus < 500) return result;
    try {
      const old = (await read()).items[id];
      if (old) return {data: old.value, source: 'cache', isMockFallback: false,
        error: 'Saved copy from ' + old.fetchedAt + '. Check official deadlines.'};
    } catch { /* Public cache only; never clears the private mutation queue. */ }
    return result;
  },
};
