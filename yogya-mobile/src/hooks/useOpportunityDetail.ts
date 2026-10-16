/**
 * useOpportunityDetail Hook — Yogya
 *
 * Provides reactive access to a single opportunity's details by ID.
 * Resolves from the backend when available, or from local demonstration data.
 */

import { useCallback, useEffect, useState } from 'react';
import { opportunityService } from '@/services/catalog';
import type { DataSource, Opportunity } from '@/types';

export function useOpportunityDetail(id?: string) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(() => {
    return id ? (opportunityService.getCachedOpportunity(id) || null) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>('mock');
  const [isMockFallback, setIsMockFallback] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setOpportunity(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await opportunityService.fetchOpportunityById(id);
      setOpportunity(result.data);
      setSource(result.source);
      setIsMockFallback(result.isMockFallback);
      setError(result.error ?? null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load opportunity details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    opportunity,
    isLoading,
    error,
    source,
    isMockFallback,
    refetch: load,
  };
}
