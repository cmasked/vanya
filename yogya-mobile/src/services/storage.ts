/**
 * Local Storage Service — Yogya
 *
 * Provides a reliable, cross-platform persistence layer for:
 * - StudentProfile (persisting onboarding details across app restarts on Android, iOS, and Web)
 * - Saved Opportunity IDs (persisting student bookmarks)
 *
 * Backed by @react-native-async-storage/async-storage on native and web,
 * with fast in-memory read caching and serialized write queuing.
 *
 * Safe-guards:
 * - Protects against JSON parse errors and corrupted data
 * - Avoids logging student private information
 * - Queues concurrent writes to prevent race conditions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StudentProfile } from '@/types';

const PROFILE_STORAGE_KEY = '@yogya_student_profile_v1';
const SAVED_OPPORTUNITIES_STORAGE_KEY = '@yogya_saved_opportunities_v1';

// Legacy keys for web backwards compatibility
const LEGACY_PROFILE_KEY = 'yogya_student_profile_v1';
const LEGACY_SAVED_KEY = 'yogya_saved_opportunities_v1';

// In-memory caches for fast read access after hydration
let memoryProfileCache: StudentProfile | null = null;
let memorySavedCache: string[] | null = null;

// Sequential write queue to prevent race conditions during rapid saves
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(operation);
  writeQueue = next.catch(() => {});
  return next; // Report a failed durable write to the caller.
}

/**
 * Safely parse JSON without throwing exceptions
 */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('YogyaStorage: Corrupted JSON encountered; discarding unreadable entry.');
    return null;
  }
}

/**
 * Validate that parsed data has the minimum required StudentProfile fields
 */
function isValidStudentProfile(data: any): data is StudentProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.displayName === 'string' &&
    typeof data.educationLevel === 'string'
  );
}

/**
 * Validate that parsed data is an array of string opportunity IDs
 */
function isValidSavedIds(data: any): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'string');
}

export const storageService = {
  /**
   * Save the completed student profile
   */
  async saveProfile(profile: StudentProfile): Promise<void> {

    await enqueueWrite(async () => {
      const serialized = JSON.stringify(profile);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, serialized);

      // Also sync to web localStorage if running on web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(PROFILE_STORAGE_KEY, serialized);
        } catch {
          // Ignore web storage quota errors
        }
      }
    });
    memoryProfileCache = profile;
  },

  /**
   * Retrieve the stored student profile if it exists
   */
  async getProfile(): Promise<StudentProfile | null> {
    if (memoryProfileCache) {
      return memoryProfileCache;
    }

    try {
      let raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);

      // Fallback to legacy web key if migrating
      if (!raw && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(PROFILE_STORAGE_KEY) || window.localStorage.getItem(LEGACY_PROFILE_KEY);
      }

      if (raw) {
        const parsed = safeJsonParse<unknown>(raw);
        if (isValidStudentProfile(parsed)) {
          memoryProfileCache = parsed;
          return parsed;
        } else {
          console.warn('YogyaStorage: Stored student profile is malformed; resetting entry.');
          await AsyncStorage.removeItem(PROFILE_STORAGE_KEY).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('YogyaStorage: Failed to read student profile from persistent storage.');
    }

    return null;
  },

  /**
   * Clear or reset the student profile
   */
  async clearProfile(): Promise<void> {

    await enqueueWrite(async () => {
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(PROFILE_STORAGE_KEY);
          window.localStorage.removeItem(LEGACY_PROFILE_KEY);
        } catch {
          // Ignore
        }
      }
    });
    memoryProfileCache = null;
  },

  /**
   * Save array of bookmarked opportunity IDs
   */
  async saveSavedOpportunityIds(ids: string[]): Promise<void> {

    await enqueueWrite(async () => {
      const serialized = JSON.stringify(ids);
      await AsyncStorage.setItem(SAVED_OPPORTUNITIES_STORAGE_KEY, serialized);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(SAVED_OPPORTUNITIES_STORAGE_KEY, serialized);
        } catch {
          // Ignore
        }
      }
    });
    memorySavedCache = [...ids];
  },

  /**
   * Retrieve stored bookmark opportunity IDs
   */
  async getSavedOpportunityIds(): Promise<string[]> {
    if (memorySavedCache) {
      return memorySavedCache;
    }

    try {
      let raw = await AsyncStorage.getItem(SAVED_OPPORTUNITIES_STORAGE_KEY);

      if (!raw && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(SAVED_OPPORTUNITIES_STORAGE_KEY) || window.localStorage.getItem(LEGACY_SAVED_KEY);
      }

      if (raw) {
        const parsed = safeJsonParse<unknown>(raw);
        if (isValidSavedIds(parsed)) {
          memorySavedCache = parsed;
          return parsed;
        } else {
          console.warn('YogyaStorage: Stored bookmark IDs malformed; returning empty list.');
          await AsyncStorage.removeItem(SAVED_OPPORTUNITIES_STORAGE_KEY).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('YogyaStorage: Failed to read saved opportunities from persistent storage.');
    }

    return [];
  },

  /**
   * Clear all saved opportunity bookmarks
   */
  async clearSavedOpportunityIds(): Promise<void> {

    await enqueueWrite(async () => {
      await AsyncStorage.removeItem(SAVED_OPPORTUNITIES_STORAGE_KEY);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(SAVED_OPPORTUNITIES_STORAGE_KEY);
          window.localStorage.removeItem(LEGACY_SAVED_KEY);
        } catch {
          // Ignore
        }
      }
    });
    memorySavedCache = [];
  },
};
