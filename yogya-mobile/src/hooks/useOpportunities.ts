/**
 * useOpportunities Hook — Yogya
 *
 * Provides reactive access to opportunities loaded from the backend
 * with automatic fallback to demonstration data.
 *
 * Supports:
 * - Loading indicator state (`isLoading`)
 * - Pull-to-refresh (`refresh`, `isRefreshing`)
 * - Data source attribution (`source: 'server' | 'mock'`, `isMockFallback`)
 * - Zero screen flashing or blank placeholders
 */

import { useCallback, useEffect, useState } from 'react';
import { MOCK_OPPORTUNITIES } from '@/data/mock';
import { opportunityService } from '@/services/catalog';
import type { DataSource, Opportunity } from '@/types';

interface UseOpportunitiesOptions {
  autoFetch?: boolean;
  type?: string;
  search?: string;
}

export function useOpportunities(options?: UseOpportunitiesOptions) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(MOCK_OPPORTUNITIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>('mock');
  const [isMockFallback, setIsMockFallback] = useState(true);

  const load = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await opportunityService.fetchOpportunities({
          type: options?.type,
          search: options?.search,
        });

        setOpportunities(result.data);
        setSource(result.source);
        setIsMockFallback(result.isMockFallback);
        setError(result.error ?? null);
      } catch (err: any) {
        setError(err?.message || 'Failed to retrieve opportunities');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [options?.type, options?.search],
  );

  useEffect(() => {
    if (options?.autoFetch !== false) {
      load(false);
    }
  }, [load, options?.autoFetch]);

  return {
    opportunities,
    isLoading,
    isRefreshing,
    error,
    source,
    isMockFallback,
    refresh: () => load(true),
  };
}
