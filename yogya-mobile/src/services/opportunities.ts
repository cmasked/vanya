/**
 * Opportunity API Service — Yogya
 *
 * Provides a clean typed boundary for retrieving opportunities from the
 * FastAPI backend, with transparent fallback to local demonstration data
 * when the server is unavailable or unconfigured.
 *
 * Guarantees:
 * - Never breaks the mobile UI or demo during development or network drops.
 * - Clearly tags data source as 'server' or 'mock'.
 * - Normalizes both snake_case (FastAPI/Pydantic standard) and camelCase payloads.
 * - Caches server-retrieved opportunities in-memory so bookmarked items resolve
 *   across screens.
 */

import { getOpportunityById, MOCK_OPPORTUNITIES } from '@/data/mock';
import type { OpportunitiesResult, Opportunity, OpportunityDetailResult } from '@/types';
import { ApiError, apiFetch, BACKEND_ENDPOINTS, isBackendConfigured } from './api';

// In-memory opportunity registry: pre-populated with mock opportunities,
// updated whenever server data is fetched so IDs resolve reliably across tabs.
const opportunityCache = new Map<string, Opportunity>();

// Initialize registry with mock data
MOCK_OPPORTUNITIES.forEach((opp) => {
  opportunityCache.set(opp.id.toLowerCase(), opp);
});

/**
 * Normalizes incoming JSON payloads from the backend.
 * Supports both standard Python snake_case (FastAPI) and TypeScript camelCase.
 */
export function normalizeOpportunity(raw: any): Opportunity {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid opportunity payload received from server');
  }

  const rawId = String(raw.id ?? '').trim();
  if (!rawId) throw new Error('Opportunity identifier is missing');
  const rawType = raw.type ?? 'scholarship';

  return {
    id: rawId,
    title: String(raw.title ?? 'Untitled Opportunity'),
    description: String(raw.description ?? ''),
    type: ['scholarship', 'scheme', 'training', 'job'].includes(rawType)
      ? rawType
      : 'scholarship',
    provider: String(raw.provider ?? 'Official Provider'),
    deadline: raw.deadline ? String(raw.deadline) : undefined,
    amount: raw.amount ? String(raw.amount) : undefined,
    eligibilitySummary: String(
      raw.eligibilitySummary ?? raw.eligibility_summary ?? 'Check detailed eligibility requirements',
    ),
    applicationUrl: /^https:\/\//i.test(String(raw.applicationUrl ?? raw.application_url ?? ''))
      ? String(raw.applicationUrl ?? raw.application_url) : undefined,
    isVerified: raw.isVerified === true || raw.is_verified === true,
    lastVerifiedAt: raw.lastVerifiedAt ?? raw.last_verified_at,
    applicationStatus: raw.applicationStatus ?? raw.application_status,
    sourceUrls: Array.isArray(raw.sourceUrls ?? raw.source_urls)
      ? (raw.sourceUrls ?? raw.source_urls).filter((url: unknown) => typeof url === 'string' && /^https:\/\//i.test(url)) : [],
    lastUpdated: String(
      raw.lastUpdated ?? raw.last_updated ?? '',
    ),
    benefits: Array.isArray(raw.benefits)
      ? raw.benefits.map(String)
      : undefined,
    eligibilityCriteria: Array.isArray(raw.eligibilityCriteria ?? raw.eligibility_criteria)
      ? (raw.eligibilityCriteria ?? raw.eligibility_criteria).map(String)
      : undefined,
    documentsRequired: Array.isArray(raw.documentsRequired ?? raw.documents_required)
      ? (raw.documentsRequired ?? raw.documents_required).map(String)
      : undefined,
    applicationSteps: Array.isArray(raw.applicationSteps ?? raw.application_steps)
      ? (raw.applicationSteps ?? raw.application_steps).map(String)
      : undefined,
  };
}

export const opportunityService = {
  /**
   * Fetch opportunities list from backend with graceful fallback to mock data.
   */
  async fetchOpportunities(params?: {
    type?: string;
    search?: string;
  }): Promise<OpportunitiesResult> {
    if (!isBackendConfigured()) {
      return {
        data: MOCK_OPPORTUNITIES,
        source: 'mock',
        isMockFallback: true,
      };
    }

    try {
      const queryParts: string[] = [];
      if (params?.type && params.type !== 'all') {
        queryParts.push(`type=${encodeURIComponent(params.type)}`);
      }
      if (params?.search && params.search.trim()) {
        queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
      }

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const endpoint = `${BACKEND_ENDPOINTS.OPPORTUNITIES}${queryString}`;

      const response = await apiFetch<unknown>(endpoint);

      let rawList: any[] = [];
      if (Array.isArray(response)) {
        rawList = response;
      } else if (response && typeof response === 'object' && Array.isArray((response as any).items)) {
        // FastAPI / Pydantic paginated response: { items: [...], total: ... }
        rawList = (response as any).items;
      } else {
        throw new Error('Unexpected response format from opportunities endpoint.');
      }

      const normalizedList = rawList.map(normalizeOpportunity);

      // Update in-memory cache
      normalizedList.forEach((opp) => {
        opportunityCache.set(opp.id.toLowerCase(), opp);
      });

      return {
        data: normalizedList,
        source: 'server',
        isMockFallback: false,
      };
    } catch (err: any) {
      console.warn(
        'YogyaBackend: Failed to fetch opportunities from server; falling back to demo data.\n' +
          `Reason: ${err?.message || 'Network error'}`,
      );

      return {
        data: MOCK_OPPORTUNITIES,
        source: 'mock',
        isMockFallback: true,
        error: err?.message || 'Server unavailable',
      };
    }
  },

  /**
   * Fetch single opportunity details by ID from backend with graceful fallback to mock data.
   */
  async fetchOpportunityById(id: string): Promise<OpportunityDetailResult> {
    if (!id) {
      return {
        data: null,
        source: 'mock',
        isMockFallback: true,
      };
    }

    if (!isBackendConfigured()) {
      const mockOpp = getOpportunityById(id);
      return {
        data: mockOpp ?? null,
        source: 'mock',
        isMockFallback: true,
      };
    }

    try {
      const endpoint = BACKEND_ENDPOINTS.OPPORTUNITY_BY_ID(id);
      const response = await apiFetch<unknown>(endpoint);
      const normalized = normalizeOpportunity(response);

      // Update registry
      opportunityCache.set(normalized.id.toLowerCase(), normalized);

      return {
        data: normalized,
        source: 'server',
        isMockFallback: false,
      };
    } catch (err: any) {
      console.warn(
        `YogyaBackend: Failed to fetch opportunity details for ID "${id}" from server; falling back to demo lookup.\n` +
          `Reason: ${err?.message || 'Network error'}`,
      );

      const status = err instanceof ApiError ? err.status : undefined;
      const fallbackOpp = status && status >= 400 && status < 500 ? undefined
        : opportunityCache.get(id.toLowerCase()) || getOpportunityById(id);
      return {
        data: fallbackOpp ?? null,
        errorStatus: status,
        source: 'mock',
        isMockFallback: true,
        error: err?.message || 'Server unavailable',
      };
    }
  },

  /**
   * Synchronously retrieve a cached opportunity by ID if previously loaded,
   * falling back to mock catalog.
   */
  getCachedOpportunity(id: string): Opportunity | undefined {
    if (!id) return undefined;
    const normalized = id.trim().toLowerCase();

    if (opportunityCache.has(normalized)) {
      return opportunityCache.get(normalized);
    }

    // Try mock lookup helper (handles demo-1, 1, etc.)
    return getOpportunityById(id);
  },
};
