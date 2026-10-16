/**
 * Saved Screen — Yogya
 *
 * Displays all opportunities bookmarked by the student:
 * - Real-time synchronization with SavedContext and AsyncStorage
 * - Warm handcrafted empty-state SVG illustration
 * - Card view with category badges, deadline, amount, and remove-bookmark action
 * - Preserves saved counts, removal actions, and persistent bookmarks
 */

import { router } from 'expo-router';
import React from 'react';
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
  CalendarIcon,
  CloseIcon,
  SavedIcon,
} from '@/components/icons/NavIcons';
import { SavedEmptyIllustration } from '@/components/illustrations/HandDrawnIllustrations';
import { YButton, YCard } from '@/components/ui';
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Palette,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useSavedOpportunities } from '@/hooks/useSavedOpportunities';
import type { OpportunityType } from '@/types';

const CATEGORY_META: Record<
  OpportunityType,
  { label: string; badgeColor: string; badgeBg: string }
> = {
  scholarship: {
    label: 'Scholarship',
    badgeColor: Palette.sageDark,
    badgeBg: Palette.sageSurface,
  },
  scheme: {
    label: 'Govt Scheme',
    badgeColor: Palette.terracottaDark,
    badgeBg: Palette.terracottaSurface,
  },
  training: {
    label: 'Skill Training',
    badgeColor: Palette.ochreDark,
    badgeBg: Palette.ochreSurface,
  },
  job: {
    label: 'Apprenticeship',
    badgeColor: Palette.forestGreenDark,
    badgeBg: Palette.forestGreenSurface,
  },
};

export default function SavedScreen() {
  const { savedOpportunities, toggleSave, clearSaved, isLoading } =
    useSavedOpportunities();

  const handleClearAllConfirm = () => {
    Alert.alert(
      'Clear All Bookmarks?',
      'Are you sure you want to remove all saved opportunities from your bookmarks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearSaved,
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
          {/* ─── Header ─────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Saved Opportunities</Text>
              {!isLoading && savedOpportunities.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {savedOpportunities.length} saved
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              Keep track of programs you intend to apply for and prepare your required documents.
            </Text>
          </View>

          {/* ─── Content / Loading / Empty State ─────────────── */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Palette.sageDark} />
              <Text style={styles.loadingText}>Loading saved opportunities...</Text>
            </View>
          ) : savedOpportunities.length === 0 ? (
            <YCard variant="elevated" style={styles.emptyCard}>
              <View style={styles.emptyIllustrationWrapper}>
                <SavedEmptyIllustration width={120} height={100} />
              </View>
              <Text style={styles.emptyTitle}>No saved opportunities yet</Text>
              <Text style={styles.emptySubtitle}>
                When you discover a scholarship, skill course, or government scheme you'd like to
                apply for, tap the bookmark icon to keep it here for quick access.
              </Text>
              <View style={styles.emptyActions}>
                <YButton
                  title="Explore Opportunities"
                  variant="primary"
                  size="md"
                  onPress={() => router.push('/explore' as any)}
                />
              </View>
            </YCard>
          ) : (
            <>
              {/* Top Controls */}
              <View style={styles.topControls}>
                <Text style={styles.sectionHeading}>Your Bookmarks</Text>
                <Pressable
                  onPress={handleClearAllConfirm}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all saved bookmarks"
                >
                  <Text style={styles.clearAllText}>Clear All</Text>
                </Pressable>
              </View>

              {/* Saved list */}
              <View style={styles.list}>
                {savedOpportunities.map((opp) => {
                  const meta = CATEGORY_META[opp.type] || CATEGORY_META.scholarship;
                  const deadlineText = opp.deadline || 'Deadline not confirmed';

                  const handleNavigate = () => {
                    router.push({
                      pathname: '/opportunity/[id]',
                      params: { id: opp.id },
                    });
                  };

                  return (
                    <Pressable
                      key={opp.id}
                      onPress={handleNavigate}
                      accessibilityRole="button"
                      accessibilityLabel={`View details for ${opp.title}`}
                    >
                      <YCard variant="elevated" style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={styles.cardInfo}>
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: meta.badgeBg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.categoryBadgeText,
                                  { color: meta.badgeColor },
                                ]}
                              >
                                {meta.label}
                              </Text>
                            </View>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                              {opp.title}
                            </Text>
                            <Text style={styles.cardProvider}>{opp.provider}</Text>
                          </View>

                          {/* Unsave button */}
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleSave(opp.id);
                            }}
                            style={styles.unsaveBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Remove from saved"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <SavedIcon
                              size={18}
                              color={Palette.terracotta}
                              strokeWidth={2}
                              filled={true}
                            />
                          </Pressable>
                        </View>

                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {opp.description}
                        </Text>

                        <View style={styles.cardMetaRow}>
                          {opp.amount ? (
                            <View style={styles.benefitTag}>
                              <Text style={styles.benefitTagText}>{opp.amount}</Text>
                            </View>
                          ) : null}
                          <View style={styles.deadlineContainer}>
                            <CalendarIcon size={13} color={Palette.warmGray} />
                            <Text style={styles.deadlineText}>{deadlineText}</Text>
                          </View>
                        </View>

                        <YButton
                          title="View Details"
                          variant="outline"
                          size="sm"
                          onPress={handleNavigate}
                          fullWidth
                        />
                      </YCard>
                    </Pressable>
                  );
                })}
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
  },

  // Header
  header: {
    marginBottom: Spacing.four,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: Palette.terracottaSurface,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.terracottaLight,
  },
  countBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.terracottaDark,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
    marginTop: Spacing.half,
    lineHeight: FontSize.sm * 1.45,
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

  // Empty State Card
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.seven,
    paddingHorizontal: Spacing.four,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  emptyIllustrationWrapper: {
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.5,
    maxWidth: 290,
  },
  emptyActions: {
    marginTop: Spacing.two,
  },

  // Top controls
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionHeading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  clearAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.brickRed,
  },

  // Saved list
  list: {
    gap: Spacing.threeHalf,
  },
  card: {
    padding: Spacing.threeHalf,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    lineHeight: FontSize.base * 1.3,
  },
  cardProvider: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    fontWeight: FontWeight.medium,
  },
  unsaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.terracottaSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Palette.charcoalLight,
    lineHeight: FontSize.xs * 1.45,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  benefitTag: {
    backgroundColor: Palette.sageSurface,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  benefitTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  deadlineText: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },

  bottomSpacer: {
    height: Spacing.seven,
  },
});
