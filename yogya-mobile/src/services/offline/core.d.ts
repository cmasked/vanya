export type Value = Record<string, any>;
export interface Operation {
  id: string; entity: string; patch: Value; method: string; path: string; getPath?: string; body: Value;
  status: 'pending' | 'failed' | 'stalled' | 'conflict'; attempts: number; nextAt: number;
}
export interface Snapshot {
  schema: number; queue: Operation[];
  records: Record<string, {value: Value; version: number; fetchedAt: number; remote?: Value}>;
  error: string | null; lastSync: number | null;
}
export interface OfflineStore {
  snapshot(): Promise<Snapshot>;
  cache(entity: string, value: Value): Promise<void>;
  enqueue(entity: string, patch: Value, request: {method: string; path: string; getPath?: string; body: Value}): Promise<Value>;
  flush(send: (operation: Operation) => Promise<Value>): Promise<void>;
  retry(): Promise<void>;
  useServer(entity: string, value: Value): Promise<void>;
}
export function createOfflineStore(
  storage: {getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>},
  key: string, uuid: () => string, now?: () => number
): OfflineStore;
