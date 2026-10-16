/**
 * Yogya Type Definitions
 *
 * Core types used across the application.
 * Backend-specific types will be added once API contracts are defined by Person 2.
 */

// ─── Navigation ─────────────────────────────────────────────────────────────

/** Route names used in the app */
export type AppRoute =
  | '/'
  | '/onboarding'
  | '/home'
  | '/explore'
  | '/saved'
  | '/profile'
  | `/opportunity/${string}`;

// ─── Student Profile & Onboarding ──────────────────────────────────────────

export type PreferredLanguage =
  | 'English'
  | 'Hindi'
  | 'Tamil'
  | 'Kannada'
  | 'Telugu'
  | 'Marathi'
  | 'Bengali'
  | 'Other';

export type EducationLevel =
  | 'Class 9'
  | 'Class 10'
  | 'Class 11'
  | 'Class 12'
  | 'Diploma'
  | 'Undergraduate'
  | 'Other';

export type MainGoal =
  | 'Scholarship'
  | 'Vocational Training'
  | 'Apprenticeship'
  | 'Career Exploration'
  | 'Other';

export type InstitutionType =
  | 'Government'
  | 'Private'
  | 'Aided'
  | 'Other';

export type LearningMode =
  | 'Offline / Classroom'
  | 'Online / Digital'
  | 'Hybrid'
  | 'Hands-on / Practical';

export interface StudentProfile {
  id: string;
  displayName: string;
  preferredLanguage: PreferredLanguage | string;
  state: string;
  district?: string;
  educationLevel: EducationLevel | string;
  stream?: string;
  institutionType?: InstitutionType | string;
  mainGoal: MainGoal | string;
  interests: string[];
  preferredLearningMode?: LearningMode | string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface OnboardingFormData {
  displayName: string;
  preferredLanguage: string;
  state: string;
  district: string;
  educationLevel: string;
  stream: string;
  institutionType: string;
  mainGoal: string;
  interests: string[];
  preferredLearningMode: string;
}

// ─── User Profile (backward compatibility placeholder for future backend integration) ──────

export interface UserProfile {
  id: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  state?: string;
  district?: string;
  educationLevel?: string;
  annualIncome?: number;
  category?: string; // SC/ST/OBC/General
  language?: string;
}

// ─── Opportunity ────────────────────────────────────────────────────────────

export type OpportunityType = 'scholarship' | 'scheme' | 'training' | 'job';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  provider: string;
  deadline?: string;
  amount?: string;
  eligibilitySummary: string;
  applicationUrl?: string;
  isVerified: boolean;
  /** ISO date string */
  lastUpdated: string;
  lastVerifiedAt?: string;
  applicationStatus?: string;
  sourceUrls?: string[];
  /** Optional detailed fields for opportunity details screen */
  benefits?: string[];
  eligibilityCriteria?: string[];
  documentsRequired?: string[];
  applicationSteps?: string[];
}

// ─── Backend Integration & Data Sources ────────────────────────────────────

export type DataSource = 'server' | 'cache' | 'mock';

export interface OpportunitiesResult {
  data: Opportunity[];
  source: DataSource;
  isMockFallback: boolean;
  error?: string | null;
}

export interface OpportunityDetailResult {
  errorStatus?: number;
  data: Opportunity | null;
  source: DataSource;
  isMockFallback: boolean;
  error?: string | null;
}

// ─── Component Props ────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type CardVariant = 'default' | 'elevated' | 'outlined';
