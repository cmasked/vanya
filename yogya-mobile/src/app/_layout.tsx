/**
 * Root Layout — Yogya
 *
 * Uses Expo Router's Stack navigator for the initial flow:
 *   / (Welcome screen) → /home (Home screen)
 *
 * Tab navigation will be introduced later when more screens are built.
 */

import { requireOptionalNativeModule } from 'expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';

import {storageService} from '@/services/storage';
import {restore} from '@/services/integration';
import {ActivityIndicator, Button, Text, View} from 'react-native';
import {SyncBridge} from '@/components/SyncBridge';
import { Colors } from '@/constants/theme';
import { ProfileProvider, useStudentProfile } from '@/context/ProfileContext';
import { SavedProvider, useSavedOpportunities } from '@/context/SavedContext';

// Keep splash screen visible while resources & storage are hydrating
SplashScreen.preventAutoHideAsync().catch(() => {});

// Disable Expo's development menu floating action button (FAB) that overlays the top-right corner
try {
  const DevMenuPreferences = requireOptionalNativeModule('DevMenuPreferences');
  DevMenuPreferences?.setPreferencesAsync?.({
    showFloatingActionButton: false,
  })?.catch?.(() => {});
} catch {
  // Ignored in production or environments without DevMenuPreferences
}

function RootNavigator() {
  const { isLoading: isProfileLoading } = useStudentProfile();
  const { isLoading: isSavedLoading } = useSavedOpportunities();
  const hasHiddenSplash = useRef(false);

  useEffect(() => {
    // Dismiss splash screen once both profile and saved items are hydrated
    if (!isProfileLoading && !isSavedLoading && !hasHiddenSplash.current) {
      hasHiddenSplash.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isProfileLoading, isSavedLoading]);

  useEffect(() => {
    // Safety fallback: ensure splash screen hides even if storage reading delays
    const fallbackTimer = setTimeout(() => {
      if (!hasHiddenSplash.current) {
        hasHiddenSplash.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 2500);

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <SyncBridge />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="voice-sync" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="opportunity/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [scope, setScope] = useState(storageService.getScope());
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const initialize = async () => {
    setError('');
    try {await restore(); setReady(true);}
    catch {void SplashScreen.hideAsync(); setError('Could not restore this account. Saved data has been preserved.');}
  };
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => setScope(storageService.getScope()));
    void initialize();
    return unsubscribe;
  }, []);
  if (!ready) return <View style={{flex: 1, justifyContent: 'center', padding: 24}}>
    {error ? <><Text>{error}</Text><Button title="Retry" onPress={() => void initialize()} /></>
      : <ActivityIndicator />}
  </View>;
  return (
    <ProfileProvider key={scope}>
      <SavedProvider>
        <RootNavigator />
      </SavedProvider>
    </ProfileProvider>
  );
}
