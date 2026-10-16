/**
 * Opportunity Details Screen — Yogya
 *
 * Displays detailed information about a selected scholarship, scheme, or training program:
 * - Opportunity title, provider, earthy category badge, and bookmark save toggle
 * - Structured sections: About, Benefits, Eligibility, Required Documents, Application Steps
 * - Clearly marked demonstration notices and official application portal link
 * - Interactive "Check My Fit" self-assessment matching student profile
 * - Friendly 404 / empty state with handcrafted SVG illustration
 * - Preserves all eligibility self-check logic and bookmark persistence
 */

import { router, useLocalSearchParams } from 'expo-router';
import {ReadinessPanel} from '@/components/ReadinessPanel';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ExternalLinkIcon,
  SavedIcon,
  ShieldIcon,
  SparkleIcon,
} from '@/components/icons/NavIcons';
import { SearchEmptyIllustration } from '@/components/illustrations/HandDrawnIllustrations';
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
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail';
import { useSavedOpportunities } from '@/hooks/useSavedOpportunities';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import type { OpportunityType } from '@/types';

const CATEGORY_META: Record<
  OpportunityType,
  { label: string; color: string; bgColor: string }
> = {
  scholarship: {
    label: 'Scholarship',
    color: Palette.sageDark,
    bgColor: Palette.sageSurface,
  },
  scheme: {
    label: 'Government Scheme',
    color: Palette.terracottaDark,
    bgColor: Palette.terracottaSurface,
  },
  training: {
    label: 'Skill Training',
    color: Palette.ochreDark,
    bgColor: Palette.ochreSurface,
  },
  job: {
    label: 'Employment / Job',
    color: Palette.forestGreenDark,
    bgColor: Palette.forestGreenSurface,
  },
};

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useStudentProfile();
  const { isSaved, toggleSave } = useSavedOpportunities();

  const [isFitCheckOpen, setIsFitCheckOpen] = useState(false);
  const [selfChecks, setSelfChecks] = useState<Record<string, boolean>>({});

  const { opportunity, isLoading, isMockFallback, source } = useOpportunityDetail(
    typeof id === 'string' ? id : undefined,
  );
  const bookmarked = opportunity ? isSaved(opportunity.id) : false;

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading && !opportunity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backButtonInner}>
              <ArrowLeftIcon size={18} color={Palette.charcoal} />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.sageDark} />
          <Text style={styles.loadingText}>Loading opportunity details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 404 / Empty Not Found State ──────────────────────────────────────────
  if (!opportunity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.backButtonInner}>
              <ArrowLeftIcon size={18} color={Palette.charcoal} />
              <Text style={styles.backButtonText}>Back</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.notFoundContainer}>
          <SearchEmptyIllustration width={110} height={90} />
          <Text style={styles.notFoundTitle}>Opportunity Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            We could not find the opportunity you requested. It may have expired, or the ID is invalid.
          </Text>
          <YButton
            title="Back to Opportunities"
            variant="primary"
            size="md"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const category = CATEGORY_META[opportunity.type] || CATEGORY_META.scholarship;

  const toggleSelfCheck = (key: string) => {
    setSelfChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenLink = () => {
    if (opportunity.applicationUrl) {
      Linking.openURL(opportunity.applicationUrl).catch((err) =>
        console.warn('Failed to open URL', err),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* ─── Header Bar ───────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.backButtonInner}>
            <ArrowLeftIcon size={18} color={Palette.charcoal} />
            <Text style={styles.backButtonText}>Back</Text>
          </View>
        </Pressable>

        <View style={styles.headerRightActions}>
          {/* Bookmark Button */}
          <Pressable
            onPress={() => toggleSave(opportunity.id)}
            style={[
              styles.bookmarkHeaderBtn,
              bookmarked && styles.bookmarkHeaderBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              bookmarked ? 'Remove from saved bookmarks' : 'Save opportunity'
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SavedIcon
              size={18}
              color={bookmarked ? Palette.terracotta : Palette.warmGray}
              strokeWidth={2}
              filled={bookmarked}
            />
          </Pressable>

          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: category.bgColor },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: category.color }]}>
              {category.label}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Scrollable Content ───────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Demo / Live Notice Banner ─────────────────────────── */}
        <View style={isMockFallback ? styles.demoBanner : styles.liveBanner}>
          <View style={styles.noticeHeaderRow}>
            <ShieldIcon
              size={14}
              color={isMockFallback ? Palette.ochreDark : Palette.forestGreenDark}
            />
            <Text style={isMockFallback ? styles.demoBannerTitle : styles.liveBannerTitle}>
              {isMockFallback ? 'Demonstration Program' : 'Verified Opportunity'}
            </Text>
          </View>
          <Text style={isMockFallback ? styles.demoBannerText : styles.liveBannerText}>
            {isMockFallback
              ? 'This entry is demonstration data for testing the Yogya navigator. Official opportunities are synchronized and verified by certified partners.'
              : 'This opportunity was retrieved directly from the verified opportunity directory.'}
          </Text>
        </View>

        {/* ─── Hero Overview Card ─────────────────────────────────── */}
        <YCard variant="elevated" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.providerName}>{opportunity.provider}</Text>
            <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
          </View>

          {/* Key metrics (Amount & Deadline) */}
          <View style={styles.metricsRow}>
            {opportunity.amount ? (
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Benefit / Value</Text>
                <Text style={styles.metricValuePrimary}>{opportunity.amount}</Text>
              </View>
            ) : null}

            <View style={[styles.metricChip, styles.metricChipSecondary]}>
              <Text style={styles.metricLabel}>Application Deadline</Text>
              <View style={styles.metricDeadlineRow}>
                <CalendarIcon size={14} color={Palette.charcoal} />
                <Text style={styles.metricValue}>
                  {opportunity.deadline || 'Open / Ongoing'}
                </Text>
              </View>
            </View>
          </View>
        </YCard>

        {/* ─── "Check My Fit" Card ─────────────────────────────────── */}
        <YCard variant="elevated" style={styles.fitCard}>
          <View style={styles.fitHeaderRow}>
            <View style={styles.fitIconCircle}>
              <SparkleIcon size={18} color={Palette.sageDark} />
            </View>
            <View style={styles.fitHeaderText}>
              <Text style={styles.fitTitle}>Check My Fit</Text>
              <Text style={styles.fitSubtitle}>
                Compare your student profile with this opportunity's criteria
              </Text>
            </View>
          </View>

          {!isFitCheckOpen ? (
            <YButton
              title="Check Eligibility & Fit"
              variant="primary"
              size="md"
              fullWidth
              onPress={() => setIsFitCheckOpen(true)}
            />
          ) : (
            <View style={styles.fitContentBox}>
              <View style={styles.fitDisclaimerBox}>
                <Text style={styles.fitDisclaimerText}>
                  <Text style={styles.boldText}>Preliminary Self-Check: </Text>
                  This guidance is based strictly on your entered profile and demo criteria. Official
                  verification is conducted by the issuing authority upon formal application submission.
                </Text>
              </View>

              {/* Profile comparison points */}
              <View style={styles.checklist}>
                {/* 1. Education Match */}
                <View style={styles.checkItem}>
                  <View style={styles.checkIconBullet}>
                    <CheckIcon
                      size={14}
                      color={profile?.educationLevel ? Palette.forestGreen : Palette.warmGray}
                    />
                  </View>
                  <View style={styles.checkItemText}>
                    <Text style={styles.checkItemTitle}>Education Level</Text>
                    <Text style={styles.checkItemDesc}>
                      {profile?.educationLevel
                        ? `Your Profile: ${profile.educationLevel} (Criteria: ${opportunity.eligibilitySummary.split(',')[0] || 'See requirements'})`
                        : 'Complete your profile to auto-verify your class/degree'}
                    </Text>
                  </View>
                </View>

                {/* 2. State & Location */}
                <View style={styles.checkItem}>
                  <View style={styles.checkIconBullet}>
                    <CheckIcon
                      size={14}
                      color={profile?.state ? Palette.forestGreen : Palette.warmGray}
                    />
                  </View>
                  <View style={styles.checkItemText}>
                    <Text style={styles.checkItemTitle}>State / Geographic Scope</Text>
                    <Text style={styles.checkItemDesc}>
                      {profile?.state
                        ? `Your Profile: ${profile.state} (Open across India / participating states)`
                        : 'Self-check: Applicable for residents of India'}
                    </Text>
                  </View>
                </View>

                {/* 3. Self-report Criteria Toggle */}
                <Pressable
                  onPress={() => toggleSelfCheck('academic')}
                  style={styles.interactiveCheckRow}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      selfChecks.academic && styles.checkboxBoxActive,
                    ]}
                  >
                    {selfChecks.academic && (
                      <CheckIcon size={12} color={Palette.softWhite} strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.interactiveCheckLabel}>
                    I meet the minimum marks or qualification requirement
                  </Text>
                </Pressable>

                {/* 4. Documents Criteria Toggle */}
                <Pressable
                  onPress={() => toggleSelfCheck('documents')}
                  style={styles.interactiveCheckRow}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      selfChecks.documents && styles.checkboxBoxActive,
                    ]}
                  >
                    {selfChecks.documents && (
                      <CheckIcon size={12} color={Palette.softWhite} strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.interactiveCheckLabel}>
                    I have access to required identity / educational certificates
                  </Text>
                </Pressable>
              </View>

              <YButton
                title="Hide Eligibility Checklist"
                variant="ghost"
                size="sm"
                onPress={() => setIsFitCheckOpen(false)}
              />
            </View>
          )}
        </YCard>

        {/* ─── Description Section ─────────────────────────────────── */}
        <YCard variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>About This Program</Text>
          <Text style={styles.paragraph}>{opportunity.description}</Text>
        </YCard>

        {/* ─── Benefits / What Student Receives ─────────────────────── */}
        <YCard variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Benefits & Financial Support</Text>
          {opportunity.benefits && opportunity.benefits.length > 0 ? (
            <View style={styles.bulletList}>
              {opportunity.benefits.map((benefit, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={styles.bulletCheckWrapper}>
                    <CheckIcon size={13} color={Palette.forestGreenDark} />
                  </View>
                  <Text style={styles.bulletText}>{benefit}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.paragraph}>
              {opportunity.amount || 'Financial and educational assistance as specified under official scheme rules.'}
            </Text>
          )}
        </YCard>

        {source === 'cache' ? <Text>Saved copy — check dates with the official source.</Text> : null}
        <Text>Application status: {opportunity.applicationStatus || 'unknown'}</Text>
        <Text>Last verified: {opportunity.lastVerifiedAt || 'not available'}</Text>
        <ReadinessPanel opportunityId={opportunity.id} />

        {/* ─── Eligibility Requirements ───────────────────────────── */}
        <YCard variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Eligibility Requirements</Text>
          <View style={styles.eligibilitySummaryBox}>
            <Text style={styles.eligibilitySummaryLabel}>Summary</Text>
            <Text style={styles.eligibilitySummaryText}>
              {opportunity.eligibilitySummary}
            </Text>
          </View>

          {opportunity.eligibilityCriteria && opportunity.eligibilityCriteria.length > 0 ? (
            <View style={styles.bulletList}>
              {opportunity.eligibilityCriteria.map((crit, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{crit}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </YCard>

        {/* ─── Required Documents ─────────────────────────────────── */}
        {opportunity.documentsRequired && opportunity.documentsRequired.length > 0 ? (
          <YCard variant="elevated" style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Required Documents</Text>
            <Text style={styles.sectionSubhead}>
              Gather these documents before starting your application:
            </Text>
            <View style={styles.bulletList}>
              {opportunity.documentsRequired.map((doc, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{doc}</Text>
                </View>
              ))}
            </View>
          </YCard>
        ) : null}

        {/* ─── Application Steps ──────────────────────────────────── */}
        {opportunity.applicationSteps && opportunity.applicationSteps.length > 0 ? (
          <YCard variant="elevated" style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>How to Apply</Text>
            <View style={styles.stepsList}>
              {opportunity.applicationSteps.map((stepDesc, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{stepDesc}</Text>
                </View>
              ))}
            </View>
          </YCard>
        ) : null}

        {/* ─── Official Link & Verification Disclaimer ────────────── */}
        <YCard variant="outlined" style={styles.disclaimerCard}>
          <Text style={styles.disclaimerHeading}>Official Application Notice</Text>
          {opportunity.applicationUrl ? (
            <View style={styles.linkActionWrapper}>
              <Text style={styles.disclaimerText}>
                External official application portal available:
              </Text>
              <YButton
                title="Open Official Application Portal"
                variant="primary"
                size="md"
                icon={<ExternalLinkIcon size={16} color={Palette.softWhite} />}
                onPress={handleOpenLink}
                fullWidth
              />
            </View>
          ) : (
            <Text style={styles.disclaimerText}>
              Official direct application links are synchronized when connected to the verified
              opportunities database. Yogya never charges any fees for scholarship or government
              scheme applications.
            </Text>
          )}
        </YCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── Sticky Bottom Action Bar ─────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtons}>
          <View style={styles.buttonHalf}>
            <YButton
              title="Return"
              variant="outline"
              size="md"
              onPress={() => router.back()}
              fullWidth
            />
          </View>
          <View style={styles.buttonHalf}>
            <YButton
              title={isFitCheckOpen ? 'Hide Fit Check' : 'Check My Fit'}
              variant="primary"
              size="md"
              onPress={() => setIsFitCheckOpen((prev) => !prev)}
              fullWidth
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.twoHalf,
    backgroundColor: Palette.ivory,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmStone,
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  backButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Palette.charcoal,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bookmarkHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkHeaderBtnActive: {
    backgroundColor: Palette.terracottaSurface,
    borderColor: Palette.terracottaLight,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Scroll body
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },

  // Notice Banner
  demoBanner: {
    backgroundColor: Palette.ochreSurface,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderRadius: BorderRadius.md,
    gap: Spacing.half,
  },
  liveBanner: {
    backgroundColor: Palette.forestGreenSurface,
    borderWidth: 1,
    borderColor: Palette.forestGreenSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderRadius: BorderRadius.md,
    gap: Spacing.half,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  demoBannerTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.ochreDark,
  },
  liveBannerTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.forestGreenDark,
  },
  demoBannerText: {
    fontSize: FontSize.xs,
    color: Palette.charcoal,
    lineHeight: FontSize.xs * 1.45,
  },
  liveBannerText: {
    fontSize: FontSize.xs,
    color: Palette.charcoal,
    lineHeight: FontSize.xs * 1.45,
  },

  // Hero Card
  heroCard: {
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  heroHeader: {
    gap: Spacing.half,
  },
  providerName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.warmGray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  opportunityTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    lineHeight: FontSize.xl * 1.3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    flexWrap: 'wrap',
  },
  metricChip: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Palette.sageSurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    gap: 3,
  },
  metricChipSecondary: {
    backgroundColor: Palette.warmStoneLight,
  },
  metricLabel: {
    fontSize: FontSize.xs - 1,
    color: Palette.warmGray,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValuePrimary: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },
  metricDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metricValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Palette.charcoal,
  },

  // Fit Card
  fitCard: {
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: Palette.softWhite,
    borderWidth: 1.5,
    borderColor: Palette.sageLight,
  },
  fitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  fitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.sageSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitHeaderText: {
    flex: 1,
    gap: 2,
  },
  fitTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  fitSubtitle: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },
  fitContentBox: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.warmStone,
  },
  fitDisclaimerBox: {
    backgroundColor: Palette.warmStoneLight,
    padding: Spacing.twoHalf,
    borderRadius: BorderRadius.sm,
  },
  fitDisclaimerText: {
    fontSize: FontSize.xs,
    color: Palette.charcoalLight,
    lineHeight: FontSize.xs * 1.45,
  },
  boldText: {
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  checklist: {
    gap: Spacing.twoHalf,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  checkIconBullet: {
    marginTop: 2,
  },
  checkItemText: {
    flex: 1,
    gap: 2,
  },
  checkItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Palette.charcoal,
  },
  checkItemDesc: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    lineHeight: FontSize.xs * 1.4,
  },
  interactiveCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Palette.warmStoneDark,
    backgroundColor: Palette.softWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: Palette.sageDark,
    borderColor: Palette.sageDark,
  },
  interactiveCheckLabel: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Palette.charcoal,
    fontWeight: FontWeight.medium,
  },

  // Generic Section Card
  sectionCard: {
    padding: Spacing.four,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  sectionHeading: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  sectionSubhead: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },
  paragraph: {
    fontSize: FontSize.sm,
    color: Palette.charcoalLight,
    lineHeight: FontSize.sm * 1.55,
  },
  bulletList: {
    gap: Spacing.two,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletCheckWrapper: {
    marginTop: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.sageDark,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Palette.charcoal,
    lineHeight: FontSize.sm * 1.45,
  },

  // Eligibility summary
  eligibilitySummaryBox: {
    backgroundColor: Palette.warmStoneLight,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  eligibilitySummaryLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: Palette.warmGray,
    textTransform: 'uppercase',
  },
  eligibilitySummaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Palette.charcoal,
    lineHeight: FontSize.sm * 1.4,
  },

  // Steps
  stepsList: {
    gap: Spacing.twoHalf,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.twoHalf,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.sageSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Palette.charcoal,
    lineHeight: FontSize.sm * 1.45,
  },

  // Disclaimer Card & External Link
  disclaimerCard: {
    padding: Spacing.four,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1.5,
    borderColor: Palette.warmStone,
  },
  disclaimerHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  linkActionWrapper: {
    gap: Spacing.twoHalf,
  },
  disclaimerText: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    lineHeight: FontSize.xs * 1.5,
  },

  // Loading & 404
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  notFoundTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.45,
    maxWidth: 280,
  },

  bottomSpacer: {
    height: Spacing.eight,
  },

  // Sticky bottom action bar
  bottomBar: {
    backgroundColor: Palette.softWhite,
    borderTopWidth: 1,
    borderTopColor: Palette.warmStone,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.twoHalf,
    ...Shadows.md,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  buttonHalf: {
    flex: 1,
  },
});
