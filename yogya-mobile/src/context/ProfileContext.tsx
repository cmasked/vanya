/**
 * ProfileContext — Yogya
 *
 * Centralized React Context for student profile and onboarding state.
 * Supports:
 * - Persisting completed profiles natively via storageService (survives app restarts)
 * - Safe async initialization without flashing incomplete states
 * - Preserving draft form inputs across navigation
 * - Privacy protection with zero PII in error logs
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {Alert} from 'react-native';
import type { OnboardingFormData, StudentProfile } from '@/types';
import { storageService } from '@/services/storage';
import {syncProfile, disconnect} from '@/services/integration';

export const INITIAL_ONBOARDING_FORM: OnboardingFormData = {
  displayName: '',
  preferredLanguage: 'English',
  state: '',
  district: '',
  educationLevel: '',
  stream: '',
  institutionType: '',
  mainGoal: '',
  interests: [],
  preferredLearningMode: '',
};

interface ProfileContextType {
  profile: StudentProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  draftForm: OnboardingFormData;
  updateDraftForm: (updates: Partial<OnboardingFormData>) => void;
  resetDraftForm: () => void;
  saveProfile: (
    data: Omit<StudentProfile, 'id' | 'isCompleted' | 'completedAt'>,
  ) => Promise<StudentProfile>;
  clearProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftForm, setDraftForm] = useState<OnboardingFormData>(INITIAL_ONBOARDING_FORM);

  useEffect(() => {
    let isMounted = true;
    let generation = 0, initialized = false;

    async function loadStoredProfile() {
      const ticket = ++generation;
      try {
        const stored = await storageService.getProfile();
        if (isMounted && ticket === generation) {
          setProfile(stored);
        }
        if (isMounted && ticket === generation && stored && !initialized) {
          initialized = true;
          setDraftForm({
            displayName: stored.displayName,
            preferredLanguage: stored.preferredLanguage,
            state: stored.state,
            district: stored.district ?? '',
            educationLevel: stored.educationLevel,
            stream: stored.stream ?? '',
            institutionType: stored.institutionType ?? '',
            mainGoal: stored.mainGoal,
            interests: stored.interests ?? [],
            preferredLearningMode: stored.preferredLearningMode ?? '',
          });
        }
      } catch {
        if (isMounted) Alert.alert('Could not load this profile', 'Saved data has been preserved. Reconnect or retry after checking device storage.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStoredProfile();
    const unsubscribe = storageService.subscribe(() => {void loadStoredProfile();});

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const updateDraftForm = useCallback((updates: Partial<OnboardingFormData>) => {
    setDraftForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetDraftForm = useCallback(() => {
    setDraftForm(INITIAL_ONBOARDING_FORM);
  }, []);

  const saveProfile = useCallback(
    async (
      data: Omit<StudentProfile, 'id' | 'isCompleted' | 'completedAt'>,
    ): Promise<StudentProfile> => {
      const newProfile: StudentProfile = {
        ...data,
        id: profile?.id || `student_${Date.now()}`,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };

      const scope = storageService.getScope();
      await storageService.saveProfile(newProfile);
      if (storageService.getScope() !== scope) throw new Error('Account changed. Reopen your profile.');
      setProfile(newProfile);
      try { await syncProfile(newProfile); }
      catch {
        Alert.alert('Profile saved on this device', 'Server sync could not finish. Reconnect and use Sync profile in Voice & sync.');
      }
      return newProfile;
    },
    [profile?.id],
  );

  const clearProfile = useCallback(async () => {
    await disconnect();
    await storageService.clearProfile();
    setProfile(null);
    setDraftForm(INITIAL_ONBOARDING_FORM);
  }, []);

  const value: ProfileContextType = {
    profile,
    isLoading,
    hasCompletedOnboarding: Boolean(profile?.isCompleted),
    draftForm,
    updateDraftForm,
    resetDraftForm,
    saveProfile,
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useStudentProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useStudentProfile must be used within a ProfileProvider');
  }
  return context;
}
