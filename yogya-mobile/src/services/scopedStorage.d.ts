import type {StudentProfile} from '../types';
export interface ScopedStorage {
  getScope(): string;
  setScope(scope: string): void;
  subscribe(listener: () => void): () => void;
  saveProfile(profile: StudentProfile): Promise<void>;
  getProfile(): Promise<StudentProfile | null>;
  clearProfile(): Promise<void>;
  saveSavedOpportunityIds(ids: string[]): Promise<void>;
  getSavedOpportunityIds(): Promise<string[]>;
  clearSavedOpportunityIds(): Promise<void>;
}
export function createScopedStorage(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}): ScopedStorage;
