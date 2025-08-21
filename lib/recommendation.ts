import { prisma } from "./db";
import { InteractionType, type Content, type UserPreferences, type Recommendation } from "@prisma/client";

/**
 * Wenzy Recommendation Engine
 * Goals:
 *  - Hybrid: content-based + collaborative + exploration
 *  - Safety first: filter out disallowed / sensitive categories & tags
 *  - Diversity: mix known preferences with novel content
 *  - Freshness: regenerate when expired / on demand
 */
export interface RecommendationEngine {
  generateRecommendations(userId: string, limit?: number): Promise<Recommendation[]>;
}

// Safety configuration (placeholder simple rule-set; upgrade to ML moderation later)
const BLOCKED_CATEGORY_KEYWORDS = [
  "violence",
  "gore",
  "weapon",
  "terror",
  "abuse",
  "nsfw",
];
const BLOCKED_TAG_KEYWORDS = ["violent", "gore", "weapon", "explicit", "abuse", "terror"];

// Mixing weights (can move to env vars)
const CONTENT_BASED_WEIGHT = 0.6;
const COLLAB_WEIGHT = 0.2;

export class WenzyRecommendationEngine implements RecommendationEngine {
  async generateRecommendations(userId: string, limit: number = 20): Promise<Recommendation[]> {
    // Resolve internal user id (we pass already real user.id from API layer normally)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    // Load / update preferences
    const preferences = await this.analyzeUserPreferences(user.id);

    // Cleanup expired recommendations
    await prisma.recommendation.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });

    const contentBasedLimit = Math.max(1, Math.floor(limit * CONTENT_BASED_WEIGHT));
    const collaborativeLimit = Math.max(1, Math.floor(limit * COLLAB_WEIGHT));
    const explorationLimit = Math.max(1, limit - contentBasedLimit - collaborativeLimit);

    const [contentBased, collaborative, exploration] = await Promise.all([
      this.contentBasedRecommendation(user.id, preferences, contentBasedLimit),
      this.collaborativeRecommendation(user.id, preferences, collaborativeLimit),
      this.explorationRecommendation(user.id, preferences, explorationLimit),
    ]);

    const scored: Array<Omit<Recommendation, "id" | "createdAt" | "content" | "expiresAt"> & { expiresAt: Date }> = [];

    for (const c of contentBased) {
      const score = await this.calculateContentScore(c, preferences, "content-based");
      scored.push({
        userId: user.id,
        contentId: c.id,
        score,
        reason: `당신이 선호한 패턴과 유사한 ${c.category} 콘텐츠`,
        algorithm: "content-based",
        isShown: false,
        isClicked: false,
        expiresAt: this.expiryDate(),
      });
    }
    for (const c of collaborative) {
      const score = (await this.calculateContentScore(c, preferences, "collaborative")) * 0.9;
      scored.push({
        userId: user.id,
        contentId: c.id,
        score,
        reason: `비슷한 취향 사용자들이 호응한 ${c.category} 콘텐츠`,
        algorithm: "collaborative",
        isShown: false,
        isClicked: false,
        expiresAt: this.expiryDate(),
      });
    }
    for (const c of exploration) {
      const score = (await this.calculateContentScore(c, preferences, "exploration")) * 0.7;
      scored.push({
        userId: user.id,
        contentId: c.id,
        score,
        reason: `새로운 카테고리(${c.category}) 탐험 콘텐츠`,
        algorithm: "exploration",
        isShown: false,
        isClicked: false,
        expiresAt: this.expiryDate(),
      });
    }

    // Deduplicate by contentId keeping highest score
    const dedup = new Map<string, typeof scored[number]>();
    for (const r of scored) {
      const existing = dedup.get(r.contentId);
      if (!existing || existing.score < r.score) dedup.set(r.contentId, r);
    }

    const finalList = Array.from(dedup.values()).sort((a, b) => b.score - a.score).slice(0, limit);

    // Upsert recommendations (avoid unique constraint errors)
    const created: Recommendation[] = [];
    for (const r of finalList) {
      const rec = await prisma.recommendation.upsert({
        where: { userId_contentId: { userId: r.userId, contentId: r.contentId } },
        update: { score: r.score, reason: r.reason, algorithm: r.algorithm, expiresAt: r.expiresAt },
        create: { ...r },
        include: { content: true },
      });
      created.push(rec);
    }
    return created;
  }

  private expiryDate(days = 7) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // Content-based: match categories, tags, type using user interactions
  private async contentBasedRecommendation(userId: string, preferences: UserPreferences, limit: number): Promise<Content[]> {
    const interactions = await prisma.userInteraction.findMany({
      where: { userId, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } },
      include: { content: true },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
    const likedCategories = new Map<string, number>();
    const likedTags = new Map<string, number>();
    const likedTypes = new Map<string, number>();
    for (const i of interactions) {
      likedCategories.set(i.content.category, (likedCategories.get(i.content.category) || 0) + 1);
      i.content.tags.forEach(t => likedTags.set(t, (likedTags.get(t) || 0) + 1));
      likedTypes.set(i.content.contentType, (likedTypes.get(i.content.contentType) || 0) + 1);
    }
    const seenIds = new Set(interactions.map(i => i.contentId));
    const candidates = await prisma.content.findMany({
      where: { isActive: true, id: { notIn: Array.from(seenIds) } },
      orderBy: { qualityScore: "desc" },
      take: limit * 5,
    });
    return this.filterUnsafe(candidates)
      .map(c => ({ c, score: this.localContentSimilarityScore(c, likedCategories, likedTags, likedTypes) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(o => o.c);
  }

  // Simple collaborative: users who liked same content, then other content they liked
  private async collaborativeRecommendation(userId: string, preferences: UserPreferences, limit: number): Promise<Content[]> {
    // User's positive content
    const userPositive = await prisma.userInteraction.findMany({
      where: { userId, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } },
      select: { contentId: true },
      take: 300,
    });
    if (userPositive.length === 0) return [];
    const positiveIds = userPositive.map(p => p.contentId);

    const similarUserInteractions = await prisma.userInteraction.findMany({
      where: { contentId: { in: positiveIds }, userId: { not: userId }, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } },
      select: { userId: true },
      distinct: ["userId"],
      take: 200,
    });
    if (similarUserInteractions.length === 0) return [];
    const similarUserIds = similarUserInteractions.map(u => u.userId);

    const otherContent = await prisma.userInteraction.findMany({
      where: { userId: { in: similarUserIds }, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] }, contentId: { notIn: positiveIds } },
      include: { content: true },
      take: limit * 8,
    });

    const scoreMap = new Map<string, { content: Content; score: number }>();
    for (const i of otherContent) {
      if (!scoreMap.has(i.contentId)) scoreMap.set(i.contentId, { content: i.content, score: 0 });
      const entry = scoreMap.get(i.contentId)!;
      entry.score += 1; // simple frequency score
    }
    const ranked = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score).map(v => v.content);
    return this.filterUnsafe(ranked).slice(0, limit);
  }

  // Exploration: categories not in favorites & not excluded, with decent quality/popularity
  private async explorationRecommendation(userId: string, preferences: UserPreferences, limit: number): Promise<Content[]> {
    const favoriteSet = new Set(preferences.favoriteCategories);
    const excludedSet = new Set(preferences.excludeCategories);
    const candidates = await prisma.content.findMany({
      where: {
        isActive: true,
        category: { notIn: Array.from(new Set([...favoriteSet, ...excludedSet])) },
        qualityScore: { gte: 0.5 },
        popularityScore: { gte: 0.2 },
      },
      orderBy: [{ popularityScore: "desc" }, { qualityScore: "desc" }],
      take: limit * 4,
    });
    return this.filterUnsafe(candidates).slice(0, limit);
  }

  private filterUnsafe(contents: Content[]): Content[] {
    return contents.filter(c => {
      const cat = c.category.toLowerCase();
      if (BLOCKED_CATEGORY_KEYWORDS.some(k => cat.includes(k))) return false;
      if (c.tags.some(t => BLOCKED_TAG_KEYWORDS.includes(t.toLowerCase()))) return false;
      return true;
    });
  }

  private localContentSimilarityScore(
    content: Content,
    likedCategories: Map<string, number>,
    likedTags: Map<string, number>,
    likedTypes: Map<string, number>
  ) {
    let score = 0;
    score += (likedCategories.get(content.category) || 0) * 2;
    for (const tag of content.tags) score += likedTags.get(tag) || 0;
    score += (likedTypes.get(content.contentType) || 0) * 1.5;
    score += content.qualityScore * 5 + content.popularityScore * 3;
    return score;
  }

  private async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    let prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await prisma.userPreferences.create({
        data: {
          userId,
          favoriteCategories: ["tech", "entertainment"],
          preferredContentTypes: ["VIDEO", "ARTICLE"],
          explorationRate: 0.2,
          excludeCategories: [],
        },
      });
    }

    const recent = await prisma.userInteraction.findMany({
      where: { userId, timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } },
      include: { content: true },
      take: 500,
    });
    if (recent.length === 0) return prefs;

    const catCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    for (const r of recent) {
      catCounts.set(r.content.category, (catCounts.get(r.content.category) || 0) + 1);
      typeCounts.set(r.content.contentType, (typeCounts.get(r.content.contentType) || 0) + 1);
    }
    const topCats = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    const topTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
    prefs = await prisma.userPreferences.update({
      where: { userId },
      data: {
        favoriteCategories: topCats.length ? topCats : prefs.favoriteCategories,
        preferredContentTypes: topTypes.length ? topTypes : prefs.preferredContentTypes,
      },
    });
    return prefs;
  }

  private async calculateContentScore(content: Content, prefs: UserPreferences, algorithm: string): Promise<number> {
    let score = 0;
    score += content.qualityScore * 0.35;
    score += content.popularityScore * 0.25;
    if (prefs.favoriteCategories.includes(content.category)) score += 0.2;
    if (prefs.preferredContentTypes.includes(content.contentType)) score += 0.15;
    if (prefs.excludeCategories.includes(content.category)) score *= 0.1;
    // Exploration slight boost for new categories when algorithm == exploration
    if (algorithm === "exploration" && !prefs.favoriteCategories.includes(content.category)) score += 0.05;
    return Math.min(score, 1);
  }
}

export const recommendationEngine = new WenzyRecommendationEngine();
