/**
 * Explore Screen — Yogya
 *
 * Pathway and category-based discovery screen for students across India:
 * - Clear category pathways (Scholarships, Government Schemes, Skill Training, Jobs)
 * - Distinct small line-art SVG illustrations for each pathway
 * - Category overview cards with insights on funding and career benefits
 * - Direct opportunity cards matching the selected pathway
 * - Integrated SVG bookmark saving and opportunity detail navigation
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CalendarIcon,
  SavedIcon,
  SparkleIcon,
} from '@/components/icons/NavIcons';
import {
  CareerIllustration,
  EducationIllustration,
  SchemeIllustration,
  SearchEmptyIllustration,
  VocationalIllustration,
} from '@/components/illustrations/HandDrawnIllustrations';
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
import { useOpportunities } from '@/hooks/useOpportunities';
import { useSavedOpportunities } from '@/hooks/useSavedOpportunities';
import type { OpportunityType } from '@/types';

interface PathwayInfo {
  type: OpportunityType;
  title: string;
  tagline: string;
  illustration: (size?: number) => React.ReactNode;
  description: string;
  whoIsItFor: string;
  keyBenefit: string;
}

const PATHWAYS: PathwayInfo[] = [
  {
    type: 'scholarship',
    title: 'Scholarships',
    tagline: 'Direct Educational Grants',
    illustration: (size = 40) => (
      <EducationIllustration width={size} height={size} />
    ),
    description:
      'Merit and need-based financial awards to cover tuition fees, examination costs, and study stipends.',
    whoIsItFor: 'Class 9-12 students, college undergrads, and polytechnic diploma aspirants.',
    keyBenefit: 'Non-repayable direct cash support paid into your student bank account.',
  },
  {
    type: 'training',
    title: 'Skill Training',
    tagline: 'Free Vocational Programs',
    illustration: (size = 40) => (
      <VocationalIllustration width={size} height={size} />
    ),
    description:
      'Certified hands-on training courses under PMKVY and Sector Skill Councils for rural & urban job readiness.',
    whoIsItFor: 'Entry requirements vary by programme and trade.',
    keyBenefit: 'Training, certification or placement support where the programme explicitly provides it.',
  },
  {
    type: 'scheme',
    title: 'Govt Schemes',
    tagline: 'Subsidies & Youth Grants',
    illustration: (size = 40) => (
      <SchemeIllustration width={size} height={size} />
    ),
    description:
      'Central and state government developmental initiatives supporting rural innovation, startups, and self-employment.',
    whoIsItFor: 'Early-stage entrepreneurs, cooperative societies, and trade innovators.',
    keyBenefit: 'Low-interest loans, seed capital grants, and technical incubation guidance.',
  },
  {
    type: 'job',
    title: 'Jobs & Appr.',
    tagline: 'Earn While You Learn',
    illustration: (size = 40) => (
      <CareerIllustration width={size} height={size} />
    ),
    description:
      'Formal on-the-job apprenticeship postings and entry-level positions across recognized industries.',
    whoIsItFor: 'ITI certificate holders, diploma engineers, and fresh graduates.',
    keyBenefit: 'Hands-on practical experience combined with mandatory monthly stipends.',
  },
];

export default function ExploreScreen() {
  const [selectedType, setSelectedType] = useState<OpportunityType>('scholarship');
  const { isSaved, toggleSave } = useSavedOpportunities();
  const { opportunities, isRefreshing, source, refresh } = useOpportunities();

  const currentPathway =
    PATHWAYS.find((p) => p.type === selectedType) || PATHWAYS[0];

  const pathwayOpportunities = opportunities.filter(
    (opp) => opp.type === selectedType,
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[Palette.sageDark]}
              tintColor={Palette.sageDark}
            />
          }
        >
          {/* ─── Header ─────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore Pathways</Text>
            <Text style={styles.headerSubtitle}>
              Explore opportunity categories. Requirements and benefits vary by programme.
            </Text>
          </View>

          <Text style={styles.headerSubtitle}>{source === 'mock'
            ? 'Demonstration records — examples only'
            : source === 'cache' ? 'Saved copy — check official dates' : 'Curated directory — check official sources'}</Text>

          {/* ─── Pathway Selector Cards (Horizontal) ─────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pathwayRow}
          >
            {PATHWAYS.map((p) => {
              const isSelected = selectedType === p.type;
              return (
                <Pressable
                  key={p.type}
                  onPress={() => setSelectedType(p.type)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${p.title} pathway`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.pathwayPill,
                      isSelected && styles.pathwayPillSelected,
                    ]}
                  >
                    <View style={styles.pathwayIconWrap}>
                      {p.illustration(36)}
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.pathwayPillTitle,
                          isSelected && styles.pathwayPillTitleSelected,
                        ]}
                      >
                        {p.title}
                      </Text>
                      <Text style={styles.pathwayPillSub}>{p.tagline}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ─── Pathway Deep Dive Overview Card ────────────── */}
          <YCard variant="elevated" style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <View style={styles.overviewIllustrationContainer}>
                {currentPathway.illustration(52)}
              </View>
              <View style={styles.overviewHeaderInfo}>
                <Text style={styles.overviewTitle}>
                  {currentPathway.title}
                </Text>
                <Text style={styles.overviewTagline}>
                  {currentPathway.tagline}
                </Text>
              </View>
            </View>

            <Text style={styles.overviewDesc}>
              {currentPathway.description}
            </Text>

            <View style={styles.overviewDetailsGrid}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Who it's for</Text>
                <Text style={styles.detailValue}>
                  {currentPathway.whoIsItFor}
                </Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Key Advantage</Text>
                <Text style={styles.detailValue}>
                  {currentPathway.keyBenefit}
                </Text>
              </View>
            </View>
          </YCard>

          {/* ─── Guidance Tip ───────────────────────────────── */}
          <View style={styles.guidanceBanner}>
            <View style={styles.guidanceIconWrapper}>
              <SparkleIcon size={16} color={Palette.ochreDark} />
            </View>
            <View style={styles.guidanceContent}>
              <Text style={styles.guidanceTitle}>Student Advice</Text>
              <Text style={styles.guidanceText}>
                You can apply to multiple opportunities concurrently. Check requirements carefully
                before preparing your documents.
              </Text>
            </View>
          </View>

          {/* ─── Opportunities in Pathway ────────────────────── */}
          <View style={styles.listSectionHeader}>
            <Text style={styles.sectionHeading}>
              {currentPathway.title} Opportunities
            </Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>
                {pathwayOpportunities.length} listed
              </Text>
            </View>
          </View>

          {pathwayOpportunities.length === 0 ? (
            <YCard variant="outlined" style={styles.emptyCard}>
              <SearchEmptyIllustration width={90} height={75} />
              <Text style={styles.emptyTitle}>New Opportunities Coming</Text>
              <Text style={styles.emptyDesc}>
                Our verification team is synchronizing opportunities in this category. Check back soon.
              </Text>
            </YCard>
          ) : (
            <View style={styles.opportunitiesList}>
              {pathwayOpportunities.map((opp) => {
                const bookmarked = isSaved(opp.id);
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
                    <YCard variant="elevated" style={styles.oppCard}>
                      <View style={styles.oppHeader}>
                        <View style={styles.oppInfo}>
                          <Text style={styles.oppProvider}>{opp.provider}</Text>
                          <Text style={styles.oppTitle} numberOfLines={2}>
                            {opp.title}
                          </Text>
                        </View>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleSave(opp.id);
                          }}
                          style={[
                            styles.bookmarkBtn,
                            bookmarked && styles.bookmarkBtnActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            bookmarked
                              ? 'Remove from saved'
                              : 'Save opportunity'
                          }
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <SavedIcon
                            size={18}
                            color={bookmarked ? Palette.terracotta : Palette.warmGray}
                            strokeWidth={2}
                            filled={bookmarked}
                          />
                        </Pressable>
                      </View>

                      <Text style={styles.oppDesc} numberOfLines={2}>
                        {opp.description}
                      </Text>

                      <View style={styles.oppTagsRow}>
                        {opp.amount ? (
                          <View style={styles.oppTag}>
                            <Text style={styles.oppTagText}>{opp.amount}</Text>
                          </View>
                        ) : null}
                        <View style={styles.deadlineContainer}>
                          <CalendarIcon size={13} color={Palette.warmGray} />
                          <Text style={styles.deadlineText}>{deadlineText}</Text>
                        </View>
                      </View>

                      <YButton
                        title="View Opportunity Details"
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
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
    marginTop: Spacing.half,
    lineHeight: FontSize.sm * 1.45,
  },

  // Pathway Pills
  pathwayRow: {
    gap: Spacing.twoHalf,
    paddingBottom: Spacing.three,
  },
  pathwayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.softWhite,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Palette.warmStone,
    gap: Spacing.twoHalf,
    minWidth: 175,
  },
  pathwayPillSelected: {
    borderColor: Palette.sageDark,
    backgroundColor: Palette.sageSurface,
  },
  pathwayIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathwayPillTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  pathwayPillTitleSelected: {
    color: Palette.charcoalDark,
  },
  pathwayPillSub: {
    fontSize: FontSize.xs - 1,
    color: Palette.warmGray,
    marginTop: 1,
  },

  // Pathway Deep Dive Overview Card
  overviewCard: {
    padding: Spacing.four,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    marginBottom: Spacing.three,
    gap: Spacing.twoHalf,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  overviewIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  overviewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  overviewTagline: {
    fontSize: FontSize.xs,
    color: Palette.terracottaDark,
    fontWeight: FontWeight.semibold,
  },
  overviewDesc: {
    fontSize: FontSize.sm,
    color: Palette.charcoalLight,
    lineHeight: FontSize.sm * 1.5,
  },
  overviewDetailsGrid: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  detailCard: {
    backgroundColor: Palette.warmStoneLight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    lineHeight: FontSize.xs * 1.45,
  },

  // Guidance Banner
  guidanceBanner: {
    flexDirection: 'row',
    backgroundColor: Palette.ochreSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    gap: Spacing.two,
  },
  guidanceIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guidanceContent: {
    flex: 1,
    gap: 2,
  },
  guidanceTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.ochreDark,
  },
  guidanceText: {
    fontSize: FontSize.xs,
    color: Palette.charcoal,
    lineHeight: FontSize.xs * 1.45,
  },

  // List Section
  listSectionHeader: {
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
  badgePill: {
    backgroundColor: Palette.sageSurface,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },

  // Opportunities List
  opportunitiesList: {
    gap: Spacing.three,
  },
  oppCard: {
    padding: Spacing.threeHalf,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  oppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  oppInfo: {
    flex: 1,
    gap: 2,
  },
  oppProvider: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    fontWeight: FontWeight.medium,
  },
  oppTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    lineHeight: FontSize.base * 1.3,
  },
  bookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.warmStoneLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBtnActive: {
    backgroundColor: Palette.terracottaSurface,
  },
  oppDesc: {
    fontSize: FontSize.xs,
    color: Palette.charcoalLight,
    lineHeight: FontSize.xs * 1.45,
  },
  oppTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  oppTag: {
    backgroundColor: Palette.sageSurface,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  oppTagText: {
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

  // Empty Card
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  emptyTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
    textAlign: 'center',
    lineHeight: FontSize.xs * 1.45,
    maxWidth: 260,
  },

  bottomSpacer: {
    height: Spacing.seven,
  },
});
