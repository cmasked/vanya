/**
 * Home Screen — Yogya
 *
 * The central dashboard for students across rural and urban India:
 * - Personalized greeting and student avatar
 * - Demo notice banner in warm ochre/stone
 * - Handcrafted search field with clear action
 * - Horizontally scrollable category filter pills
 * - Quick-explore category cards with compact hand-drawn SVG illustrations
 * - Redesigned opportunity cards with provider, category badge, amount/deadline, and SVG bookmark toggle
 * - Editorial empty state with hand-drawn illustration
 * - Preserves search, category filtering, result counts, pull-to-refresh, and route navigation
 */

import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  CloseIcon,
  SavedIcon,
  SearchIcon,
  ShieldIcon,
} from '@/components/icons/NavIcons';
import {
  CareerIllustration,
  EducationIllustration,
  SchemeIllustration,
  SearchEmptyIllustration,
  VocationalIllustration,
} from '@/components/illustrations/HandDrawnIllustrations';
import { YButton, YCard, YInput } from '@/components/ui';
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
import { useStudentProfile } from '@/hooks/useStudentProfile';
import type { OpportunityType } from '@/types';

type FilterCategory = 'all' | OpportunityType;

interface CategoryFilterItem {
  id: FilterCategory;
  label: string;
}

const CATEGORY_FILTERS: CategoryFilterItem[] = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'scholarship', label: 'Scholarships' },
  { id: 'scheme', label: 'Govt Schemes' },
  { id: 'training', label: 'Skill Training' },
  { id: 'job', label: 'Jobs & Apprenticeships' },
];

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

export default function HomeScreen() {
  const { profile } = useStudentProfile();
  const { isSaved, toggleSave } = useSavedOpportunities();
  const { opportunities, isRefreshing, isMockFallback, source, refresh } = useOpportunities();

  const displayName = profile?.displayName?.trim();
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'Y';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');

  // ─── Combined Search and Filter Logic ────────────────────────────────────
  const filteredOpportunities = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    return opportunities.filter((opp) => {
      // 1. Category filter
      if (selectedCategory !== 'all' && opp.type !== selectedCategory) {
        return false;
      }

      // 2. Search query filter
      if (!trimmedQuery) {
        return true;
      }

      const titleMatch = opp.title.toLowerCase().includes(trimmedQuery);
      const providerMatch = opp.provider.toLowerCase().includes(trimmedQuery);
      const typeMatch = opp.type.toLowerCase().includes(trimmedQuery);
      const descMatch = opp.description.toLowerCase().includes(trimmedQuery);

      const matchedCategory = CATEGORY_FILTERS.find((c) => c.id === opp.type);
      const categoryLabelMatch = matchedCategory
        ? matchedCategory.label.toLowerCase().includes(trimmedQuery)
        : false;

      return (
        titleMatch ||
        providerMatch ||
        typeMatch ||
        descMatch ||
        categoryLabelMatch
      );
    });
  }, [opportunities, searchQuery, selectedCategory]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[Palette.sageDark]}
              tintColor={Palette.sageDark}
            />
          }
        >
          {/* ─── Header & Student Greeting ─────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {displayName ? `Namaste, ${displayName}` : 'Namaste'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {profile?.educationLevel
                  ? `${profile.educationLevel}${profile.state ? ` • ${profile.state}` : ''}`
                  : 'Discover programs made for your journey'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/profile' as any)}
              accessibilityRole="button"
              accessibilityLabel="View your student profile"
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            </Pressable>
          </View>

          {/* ─── Demo / Live Data Notice ───────────────────── */}
          <View style={isMockFallback ? styles.demoBanner : styles.liveBanner}>
            <View style={styles.bannerIconWrapper}>
              <ShieldIcon
                size={14}
                color={isMockFallback ? Palette.ochreDark : Palette.forestGreenDark}
              />
            </View>
            <Text style={isMockFallback ? styles.demoBannerText : styles.liveBannerText}>
              {source === 'cache' ? 'Saved copy — check current dates with the official source' : isMockFallback
                ? 'Showing demonstration programs — connect backend for real-time listings'
                : 'Live Data — Connected to verified opportunity directory'}
            </Text>
          </View>

          {/* ─── Search Bar ─────────────────────────────────── */}
          <View style={styles.searchSection}>
            <YInput
              placeholder="Search scholarships, schemes, training…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search opportunities"
              returnKeyType="search"
              leftIcon={<SearchIcon size={18} color={Palette.warmGray} />}
              rightIcon={
                searchQuery.length > 0 ? (
                  <Pressable
                    onPress={handleClearSearch}
                    style={styles.clearButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search text"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <CloseIcon size={16} color={Palette.warmGray} />
                  </Pressable>
                ) : undefined
              }
            />
          </View>

          {/* ─── Category Filter Pills (Horizontal) ──────────── */}
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsRow}
            >
              {CATEGORY_FILTERS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${cat.label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ─── Quick Explore Categories Grid ───────────────── */}
          <View style={styles.categoriesHeaderRow}>
            <Text style={styles.sectionTitle}>Explore Pathways</Text>
            {selectedCategory !== 'all' && (
              <Pressable
                onPress={() => setSelectedCategory('all')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.showAllText}>View All</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.categoriesGrid}>
            {/* Scholarships Shortcut */}
            <CategoryCard
              title="Scholarships"
              count="120+ Grants"
              illustration={<EducationIllustration width={44} height={44} />}
              isSelected={selectedCategory === 'scholarship'}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === 'scholarship' ? 'all' : 'scholarship',
                )
              }
            />

            {/* Govt Schemes Shortcut */}
            <CategoryCard
              title="Govt Schemes"
              count="85+ Programs"
              illustration={<SchemeIllustration width={44} height={44} />}
              isSelected={selectedCategory === 'scheme'}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === 'scheme' ? 'all' : 'scheme',
                )
              }
            />

            {/* Skill Training Shortcut */}
            <CategoryCard
              title="Skill Training"
              count="60+ Courses"
              illustration={<VocationalIllustration width={44} height={44} />}
              isSelected={selectedCategory === 'training'}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === 'training' ? 'all' : 'training',
                )
              }
            />

            {/* Jobs & Apprenticeships Shortcut */}
            <CategoryCard
              title="Jobs & Appr."
              count="40+ Postings"
              illustration={<CareerIllustration width={44} height={44} />}
              isSelected={selectedCategory === 'job'}
              onPress={() =>
                setSelectedCategory(selectedCategory === 'job' ? 'all' : 'job')
              }
            />
          </View>

          {/* ─── Opportunities Header & Results Counter ──────── */}
          <View style={styles.resultsHeader}>
            <View style={styles.resultsTitleColumn}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'all' && !searchQuery.trim()
                  ? 'Featured Opportunities'
                  : 'Matching Opportunities'}
              </Text>
              <Text style={styles.resultsCountText}>
                {filteredOpportunities.length === 1
                  ? '1 opportunity available'
                  : `${filteredOpportunities.length} opportunities available`}
                {selectedCategory !== 'all' &&
                  ` in ${
                    CATEGORY_FILTERS.find((c) => c.id === selectedCategory)
                      ?.label || selectedCategory
                  }`}
              </Text>
            </View>

            {(searchQuery.trim() || selectedCategory !== 'all') && (
              <Pressable
                onPress={handleResetFilters}
                style={styles.resetButton}
                accessibilityRole="button"
                accessibilityLabel="Reset search and filters"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </Pressable>
            )}
          </View>

          {/* ─── Opportunities List or Empty State ───────────── */}
          {filteredOpportunities.length === 0 ? (
            <YCard variant="elevated" style={styles.emptyCard}>
              <View style={styles.emptyIllustrationWrapper}>
                <SearchEmptyIllustration width={100} height={80} />
              </View>
              <Text style={styles.emptyTitle}>No matching opportunities</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                  ? `No opportunities matched "${searchQuery.trim()}"${
                      selectedCategory !== 'all'
                        ? ` under the selected category.`
                        : '.'
                    }`
                  : `There are currently no programs listed in this category.`}
              </Text>
              <View style={styles.emptyActions}>
                {searchQuery.trim() ? (
                  <YButton
                    title="Clear Search"
                    variant="outline"
                    size="sm"
                    onPress={handleClearSearch}
                  />
                ) : null}
                {selectedCategory !== 'all' ? (
                  <YButton
                    title="Show All Opportunities"
                    variant="primary"
                    size="sm"
                    onPress={() => setSelectedCategory('all')}
                  />
                ) : null}
              </View>
            </YCard>
          ) : (
            <View style={styles.opportunitiesList}>
              {filteredOpportunities.map((opp) => {
                const meta = CATEGORY_META[opp.type] || CATEGORY_META.scholarship;
                const deadlineText = opp.deadline || 'Open / Ongoing';
                const bookmarked = isSaved(opp.id);

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
                    <YCard variant="elevated" style={styles.opportunityCard}>
                      {/* Top metadata row with Category Badge & Bookmark */}
                      <View style={styles.oppTopRow}>
                        <View
                          style={[
                            styles.oppCategoryBadge,
                            { backgroundColor: meta.badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.oppCategoryBadgeText,
                              { color: meta.badgeColor },
                            ]}
                          >
                            {meta.label}
                          </Text>
                        </View>

                        {/* Recognizable bookmark action */}
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
                            bookmarked ? 'Remove from saved' : 'Save opportunity'
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

                      {/* Opportunity Title & Provider */}
                      <View style={styles.oppContent}>
                        <Text style={styles.oppTitle} numberOfLines={2}>
                          {opp.title}
                        </Text>
                        <Text style={styles.oppProvider}>{opp.provider}</Text>
                        <Text style={styles.oppDesc} numberOfLines={2}>
                          {opp.description}
                        </Text>
                      </View>

                      {/* Benefits & Deadline Tags */}
                      <View style={styles.oppMetaRow}>
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

                      {/* Card Footer with CTA */}
                      <View style={styles.oppFooter}>
                        <YButton
                          title="View Details"
                          variant="outline"
                          size="sm"
                          onPress={handleNavigate}
                          fullWidth
                        />
                      </View>
                    </YCard>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ─── Bottom Spacer ──────────────────────────────── */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Compact Category Card Component ─────────────────────────────────────────

function CategoryCard({
  title,
  count,
  illustration,
  isSelected,
  onPress,
}: {
  title: string;
  count: string;
  illustration: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.categoryCardWrapper}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Category ${title}, ${count}`}
        accessibilityState={{ selected: isSelected }}
      >
        <YCard
          variant="elevated"
          style={[
            styles.categoryCard,
            isSelected && styles.categoryCardSelected,
          ]}
        >
          <View style={styles.categoryIllustration}>{illustration}</View>
          <Text
            style={[
              styles.categoryTitle,
              isSelected && styles.categoryTitleSelected,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={styles.categoryCount}>{count}</Text>
        </YCard>
      </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  greetingContainer: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  greeting: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Palette.warmGray,
    marginTop: Spacing.half,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.sageSurface,
    borderWidth: 1.5,
    borderColor: Palette.sageLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  avatarText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },

  // Notice Banner
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.ochreSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    gap: Spacing.two,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.forestGreenSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.forestGreenSurface,
    gap: Spacing.two,
  },
  bannerIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Palette.ochreDark,
    lineHeight: FontSize.xs * 1.45,
    fontWeight: FontWeight.medium,
  },
  liveBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Palette.forestGreenDark,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xs * 1.45,
  },

  // Search input section
  searchSection: {
    marginBottom: Spacing.three,
  },
  clearButton: {
    padding: Spacing.one,
  },

  // Category filter chips
  filterSection: {
    marginBottom: Spacing.four,
    marginHorizontal: -Spacing.four,
  },
  filterChipsRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.threeHalf,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Palette.warmStone,
    backgroundColor: Palette.softWhite,
  },
  filterChipSelected: {
    borderColor: Palette.sageDark,
    backgroundColor: Palette.sageDark,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Palette.charcoal,
  },
  filterChipTextSelected: {
    color: Palette.softWhite,
  },

  // Quick Explore Categories
  categoriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.twoHalf,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
  },
  showAllText: {
    fontSize: FontSize.xs,
    color: Palette.sageDark,
    fontWeight: FontWeight.bold,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.twoHalf,
    marginBottom: Spacing.four,
  },
  categoryCardWrapper: {
    width: '48%',
    flexGrow: 1,
  },
  categoryCard: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: BorderRadius.lg,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
    gap: Spacing.half,
  },
  categoryCardSelected: {
    borderColor: Palette.sageDark,
    backgroundColor: Palette.sageSurface,
  },
  categoryIllustration: {
    marginBottom: Spacing.one,
  },
  categoryTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Palette.charcoal,
    textAlign: 'center',
  },
  categoryTitleSelected: {
    color: Palette.charcoalDark,
    fontWeight: FontWeight.bold,
  },
  categoryCount: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },

  // Opportunities Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  resultsTitleColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  resultsCountText: {
    fontSize: FontSize.xs,
    color: Palette.warmGray,
  },
  resetButton: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  resetButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Palette.sageDark,
  },

  // Opportunities List
  opportunitiesList: {
    gap: Spacing.threeHalf,
  },
  opportunityCard: {
    padding: Spacing.threeHalf,
    gap: Spacing.twoHalf,
    backgroundColor: Palette.softWhite,
    borderWidth: 1,
    borderColor: Palette.warmStone,
  },
  oppTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oppCategoryBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  oppCategoryBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  oppContent: {
    gap: Spacing.half,
  },
  oppTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Palette.charcoal,
    lineHeight: FontSize.base * 1.3,
  },
  oppProvider: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Palette.warmGray,
  },
  oppDesc: {
    fontSize: FontSize.xs,
    color: Palette.charcoalLight,
    lineHeight: FontSize.xs * 1.45,
    marginTop: Spacing.half,
  },
  oppMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
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
  oppFooter: {
    marginTop: Spacing.half,
  },

  // Empty Card
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    backgroundColor: Palette.softWhite,
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
    lineHeight: FontSize.sm * 1.45,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },

  bottomSpacer: {
    height: Spacing.seven,
  },
});
