/**
 * SavedContext — Yogya
 *
 * Provides reactive bookmark / saved opportunities state across the app.
 * Automatically synchronizes with storageService so bookmarked items persist across
 * Home, Explore, Saved, and Opportunity Details screens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Alert} from 'react-native';
import { getOpportunityById } from '@/data/mock';
import { opportunityService } from '@/services/catalog';
import {syncBookmark} from '@/services/integration';
import { storageService } from '@/services/storage';
import type { Opportunity } from '@/types';

interface SavedContextType {
  savedIds: string[];
  savedOpportunities: Opportunity[];
  isSaved: (id: string) => boolean;
  toggleSave: (id: string) => Promise<boolean>;
  clearSaved: () => Promise<void>;
  isLoading: boolean;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const idsRef = useRef<string[]>([]);
  const writes = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let isMounted = true;

    async function loadSaved() {
      try {
        await opportunityService.hydrateCache().catch(() => {});
        const ids = await storageService.getSavedOpportunityIds();
        idsRef.current = ids;
        if (isMounted) {
          setSavedIds(ids || []);
        }
      } catch {
        console.warn('SavedContext: Failed to load saved opportunity IDs from storage.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSaved();

    return () => {
      isMounted = false;
    };
  }, []);

  const isSaved = useCallback(
    (id: string): boolean => {
      if (!id) return false;
      const normalized = id.toLowerCase();
      return savedIds.some((savedId) => {
        const s = savedId.toLowerCase();
        return (
          s === normalized ||
          s === `demo-${normalized}` ||
          `demo-${s}` === normalized
        );
      });
    },
    [savedIds],
  );

  const matches = (a: string, b: string) => a.toLowerCase() === b.toLowerCase() ||
    a.toLowerCase() === 'demo-' + b.toLowerCase() ||
    'demo-' + a.toLowerCase() === b.toLowerCase();

  const toggleSave = useCallback((id: string): Promise<boolean> => {
    const job = writes.current.then(async () => {
      if (!id) return false;
      const exists = idsRef.current.some(saved => matches(saved, id));
      const next = exists ? idsRef.current.filter(saved => !matches(saved, id)) : [...idsRef.current, id];
      await syncBookmark(id, !exists);
      await storageService.saveSavedOpportunityIds(next);
      idsRef.current = next; setSavedIds(next);
      return !exists;
    });
    writes.current = job.catch(() => {});
    return job.catch(() => {
      Alert.alert('Could not save the change', 'Please check device storage and try again.');
      return idsRef.current.some(saved => matches(saved, id));
    });
  }, []);

  const clearSaved = useCallback((): Promise<void> => {
    const job = writes.current.then(async () => {
      for (const id of idsRef.current) await syncBookmark(id, false);
      await storageService.clearSavedOpportunityIds();
      idsRef.current = []; setSavedIds([]);
    });
    writes.current = job.catch(() => {});
    return job.catch(() => {
      Alert.alert('Could not clear saved items', 'Please check device storage and try again.');
    });
  }, []);

  const savedOpportunities = useMemo(() => {
    return savedIds
      .map((id) => opportunityService.getCachedOpportunity(id) || getOpportunityById(id))
      .filter((opp): opp is Opportunity => opp !== undefined);
  }, [savedIds]);

  const value: SavedContextType = {
    savedIds,
    savedOpportunities,
    isSaved,
    toggleSave,
    clearSaved,
    isLoading,
  };

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}

export function useSavedOpportunities(): SavedContextType {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error(
      'useSavedOpportunities must be used within a SavedProvider',
    );
  }
  return context;
}
