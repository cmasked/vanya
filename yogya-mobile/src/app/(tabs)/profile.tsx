/**
 * Profile Screen — Yogya
 *
 * Displays student profile details collected during onboarding:
 * - Profile header with avatar, name, and active status badge
 * - Organized cards for Location, Education, and Goals & Preferences
 * - "Edit Profile Details" action returning to onboarding without breaking navigation
 * - Privacy protection notice guaranteeing no sensitive identity/bank data stored
 */

import {integrationStrings} from '@/constants/integrationStrings';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CheckIcon,
  ShieldIcon,
  SparkleIcon,
} from '@/components/icons/NavIcons';
import { EducationIllustration } from '@/components/illustrations/HandDrawnIllustrations';
import { YButton, YCard } from '@/components/ui';
import {
  BorderRadius,
  Colors,
  FontSize,
  FontWeight,
  Palette,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useStudentProfile } from '@/hooks/useStudentProfile';

export default function ProfileScreen() {
  const { profile, clearProfile, hasCompletedOnboarding, isLoading } = useStudentProfile();
  const [isResetting, setIsResetting] = useState(false);

  const displayName = profile?.displayName?.trim() || 'Student';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleEditProfile = () => {
    router.push('/onboarding' as any);
  };

  const handleResetConfirm = () => {
    Alert.alert(
      'Reset Profile?',
      'Are you sure you want to reset your profile details? You can re-enter them anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await clearProfile();
              router.replace('/onboarding' as any);
            } catch (err) {
              console.warn('Failed to reset profile', err);
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Palette.sageDark} />
              <Text style={styles.loadingText}>Loading profile details...</Text>
            </View>
          ) : (
            <>
              {/* ─── Profile Header Card ─────────────────────────── */}
              <YCard variant="elevated" style={styles.headerCard}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{avatarLetter}</Text>
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.locationSubtitle}>
                      {profile?.state ? `${profile.state}` : 'India'}
                      {profile?.district ? `, ${profile.district}` : ''}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          !hasCompletedOnboarding && styles.statusBadgeDraft,
                        ]}
                      >
                        {hasCompletedOnboarding ? (
                          <View style={styles.badgeInner}>
                            <CheckIcon size={12} color={Palette.forestGreenDark} strokeWidth={3} />
                            <Text style={styles.statusBadgeText}>Profile Active</Text>
                          </View>
                        ) : (
                          <Text style={styles.statusBadgeDraftText}>Draft Profile</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                <YButton
                  title={integrationStrings[profile?.preferredLanguage === 'Tamil' ? 'ta' : 'en'].settings}
                  onPress={() => router.push('/voice-sync')}
                  fullWidth
                />
                <YButton
                  title="Edit Profile Details"
                  variant="outline"
                  size="md"
                  onPress={handleEditProfile}
                  fullWidth
                />
              </YCard>

              {/* ─── Education Section ───────────────────────────── */}
              <YCard variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <EducationIllustration width={28} height={28} />
                  <Text style={styles.sectionTitle}>Education</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Current Level</Text>
                  <Text style={styles.infoVal}>
                    {profile?.educationLevel || 'Not specified'}
                  </Text>
                </View>

                {profile?.stream ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Stream / Field</Text>
                    <Text style={styles.infoVal}>{profile.stream}</Text>
                  </View>
                ) : null}

                {profile?.institutionType ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Institution Type</Text>
                    <Text style={styles.infoVal}>{profile.institutionType}</Text>
                  </View>
                ) : null}
              </YCard>

              {/* ─── Goals & Preferences ─────────────────────────── */}
              <YCard variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.iconCircle}>
                    <SparkleIcon size={18} color={Palette.terracottaDark} />
                  </View>
                  <Text style={styles.sectionTitle}>Goals & Preferences</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Primary Goal</Text>
                  <Text style={styles.infoVal}>
                    {profile?.mainGoal || 'Not specified'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Preferred Language</Text>
                  <Text style={styles.infoVal}>
                    {profile?.preferredLanguage || 'English'}
                  </Text>
                </View>

                {profile?.preferredLearningMode ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Learning Mode</Text>
                    <Text style={styles.infoVal}>
                      {profile.preferredLearningMode}
                    </Text>
                  </View>
                ) : null}

                {/* Interests Chips */}
                <View style={styles.interestsBlock}>
                  <Text style={styles.interestsLabel}>Selected Interests</Text>
                  <View style={styles.interestsWrap}>
                    {profile?.interests && profile.interests.length > 0 ? (
                      profile.interests.map((it) => (
                        <View key={it} style={styles.interestChip}>
                          <Text style={styles.interestChipText}>{it}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noInterestsText}>No interests selected</Text>
                    )}
                  </View>
                </View>
              </YCard>

              {/* ─── Privacy Reassurance Notice ──────────────────── */}
              <View style={styles.privacyCard}>
                <View style={styles.privacyHeader}>
                  <ShieldIcon size={18} color={Palette.sageDark} />
                  <Text style={styles.privacyTitle}>Privacy Protected</Text>
                </View>
                <Text style={styles.privacyText}>
                  Yogya collects only minimal educational and goal preferences to calculate eligibility
                  matches. We never ask for or store Aadhaar numbers, bank account credentials, or
                  sensitive identity documents during initial onboarding.
                </Text>
              </View>

              {/* ─── Reset Option ────────────────────────────────── */}
              <View style={styles.resetContainer}>
                <Pressable
                  onPress={handleResetConfirm}
                  style={styles.resetButton}
                  disabled={isResetting}
                  accessibilityRole="button"
                  accessibilityLabel="Reset student profile"
                >
                  <Text style={styles.resetButtonText}>
                    {isResetting ? 'Resetting...' : 'Reset & Re-enter Profile'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.eight,
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
  },

  // Header Card
  headerCard: {
    padding: Spacing.four,
    gap: Spacing.four,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.sageSurface,
    borderWidth: 1.5,
    borderColor: Palette.sageLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  avatarText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  locationSubtitle: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Palette.forestGreenSurface,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.forestGreenSurface,
  },
  statusBadgeDraft: {
    backgroundColor: Palette.ochreSurface,
    borderColor: Palette.ochreSurface,
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: Palette.forestGreenDark,
  },
  statusBadgeDraftText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: Palette.ochreDark,
  },

  // Section Cards
  sectionCard: {
    padding: Spacing.four,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.half,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.terracottaSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmStoneLight,
  },
  infoKey: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    fontWeight: FontWeight.medium,
  },
  infoVal: {
    fontSize: FontSize.sm,
    color: Palette.charcoal,
    fontWeight: FontWeight.semibold,
  },

  // Interests
  interestsBlock: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  interestsLabel: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    fontWeight: FontWeight.medium,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  interestChip: {
    backgroundColor: Palette.sageSurface,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Palette.sageLight,
  },
  interestChipText: {
    fontSize: FontSize.xs,
    color: Palette.sageDark,
    fontWeight: FontWeight.medium,
  },
  noInterestsText: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },

  // Privacy Reassurance Notice
  privacyCard: {
    backgroundColor: Palette.sageSurface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.sageLight,
    gap: Spacing.one,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  privacyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },
  privacyText: {
    fontSize: FontSize.xs,
    color: Palette.charcoal,
    lineHeight: FontSize.xs * 1.55,
  },

  // Reset
  resetContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  resetButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  resetButtonText: {
    fontSize: FontSize.xs,
    color: Palette.brickRed,
    fontWeight: FontWeight.bold,
  },

  bottomSpacer: {
    height: Spacing.seven,
  },
});
