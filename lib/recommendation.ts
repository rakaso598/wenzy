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
  generateRecommendations(userId: string, limit?: number): Promise<(Recommendation & { content: Content | null })[]>;
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
  async generateRecommendations(userId: string, limit: number = 20): Promise<(Recommendation & { content: Content | null })[]> {
    // Resolve internal user id (we pass already real user.id from API layer normally)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    // Load / update preferences
    const preferences = await this.analyzeUserPreferences(user.id);

    // Cold-start: if user has very few positive interactions, use popularity+explore mix
    const positiveCount = await prisma.userInteraction.count({ where: { userId: user.id, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } } });
    if (positiveCount < 3) {
      // Popular + exploration mix
      const popular = await prisma.content.findMany({ where: { isActive: true, isSafe: true, category: { notIn: preferences.excludeCategories } }, orderBy: { popularityScore: "desc" }, take: Math.max(limit, 50) });
      const explored = await this.explorationRecommendation(user.id, preferences, Math.max(5, Math.floor(limit * 0.3)));
      const merged = Array.from(new Map([...popular, ...explored].map(c => [c.id, c])).values()).slice(0, limit);
      // Upsert quick recommendations
      const created = [] as (Recommendation & { content: Content | null })[];
      for (const c of merged) {
        const rec = await prisma.recommendation.upsert({
          where: { userId_contentId: { userId: user.id, contentId: c.id } },
          update: { score: 0.5, reason: "초기 인기 기반 추천", algorithm: "cold-start", expiresAt: this.expiryDate() },
          create: { userId: user.id, contentId: c.id, score: 0.5, reason: "초기 인기 기반 추천", algorithm: "cold-start", expiresAt: this.expiryDate() },
          include: { content: true },
        });
        created.push(rec as Recommendation & { content: Content | null });
      }
      return created;
    }

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

    // Compute dynamic recent popularity map to adjust scores without writing DB
    const recentCounts = await this.getRecentInteractionCounts(30, Array.from(new Set([...contentBased, ...collaborative, ...exploration].map(c => c.id))));

    const scored: Array<Omit<Recommendation, "id" | "createdAt" | "content" | "expiresAt"> & { expiresAt: Date }> = [];

    for (const c of contentBased) {
      const base = await this.calculateContentScoreWithRecency(c, preferences, "content-based", recentCounts);
      scored.push({ userId: user.id, contentId: c.id, score: base, reason: `당신이 선호한 패턴과 유사한 ${c.category} 콘텐츠`, algorithm: "content-based", isShown: false, isClicked: false, expiresAt: this.expiryDate() });
    }
    for (const c of collaborative) {
      const base = await this.calculateContentScoreWithRecency(c, preferences, "collaborative", recentCounts) * 0.9;
      scored.push({ userId: user.id, contentId: c.id, score: base, reason: `비슷한 취향 사용자들이 호응한 ${c.category} 콘텐츠`, algorithm: "collaborative", isShown: false, isClicked: false, expiresAt: this.expiryDate() });
    }
    for (const c of exploration) {
      const base = await this.calculateContentScoreWithRecency(c, preferences, "exploration", recentCounts) * 0.7;
      scored.push({ userId: user.id, contentId: c.id, score: base, reason: `새로운 카테고리(${c.category}) 탐험 콘텐츠`, algorithm: "exploration", isShown: false, isClicked: false, expiresAt: this.expiryDate() });
    }

    // Deduplicate keeping highest
    const dedup = new Map<string, typeof scored[number]>();
    for (const r of scored) {
      const existing = dedup.get(r.contentId);
      if (!existing || existing.score < r.score) dedup.set(r.contentId, r);
    }
    const finalCandidates = Array.from(dedup.values()).sort((a, b) => b.score - a.score).slice(0, Math.max(limit * 4, 100));

    // Diversity via MMR (Maximal Marginal Relevance)
    const selected = await this.selectWithMMR(finalCandidates.map(f => ({ id: f.contentId, score: f.score })), limit, 0.7);
    let finalList = selected.map(s => finalCandidates.find(f => f.contentId === s.id)!).slice(0, limit);

    // Post-process: dedupe near-duplicates and cap authors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalList = await this.postProcessRanking(finalList as any) as typeof finalList;

    // Fire-and-forget: update lightweight popularity estimates for these candidates
    this.updatePopularityEstimates(new Map(Array.from(recentCounts.entries()).slice(0, 50))).catch(() => { });

    // Upsert
    const created: (Recommendation & { content: Content | null })[] = [];
    for (const r of finalList) {
      const rec = await prisma.recommendation.upsert({ where: { userId_contentId: { userId: r.userId, contentId: r.contentId } }, update: { score: r.score, reason: r.reason, algorithm: r.algorithm, expiresAt: r.expiresAt }, create: { ...r }, include: { content: true } });
      created.push(rec as Recommendation & { content: Content | null });
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
      take: limit * 8,
    });

    // compute user embedding once (hybrid content-based)
    const userEmbedding = await this.computeUserEmbedding(userId);

    const scored = this.filterUnsafe(candidates)
      .map(c => {
        // tag/category/type similarity score
        const hybridScore = this.localContentSimilarityScore(c, likedCategories, likedTags, likedTypes);
        // embedding similarity (if available)
        let embSim = 0;
        const cEmb = (c as any).embedding as number[] | undefined;
        if (userEmbedding && cEmb && cEmb.length > 0) embSim = this.cosine(userEmbedding, cEmb);
        // combine with simple weights
        const final = hybridScore * 0.7 + embSim * 3; // emb scaled to be comparable
        return { c, score: final };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(o => o.c);

    return scored;
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

  // New: compute cosine similarity
  private cosine(a: number[] | null | undefined, b: number[] | null | undefined) {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  // New: MMR selection with category penalty to improve tag/category dispersion
  private async selectWithMMR(candidates: { id: string; score: number }[], k: number, lambda = 0.7) {
    const selected: { id: string; score: number }[] = [];
    const remaining = [...candidates];
    // Precompute content embeddings and categories map
    const embedMap = new Map<string, number[]>();
    const categoryMap = new Map<string, string>();
    // fetch full content rows (embedding may not be exposed via select in generated types), then read fields via any
    const rows = await prisma.content.findMany({ where: { id: { in: remaining.map(r => r.id) } } });
    for (const r of rows) { embedMap.set(r.id, ((r as any).embedding || []) as number[]); categoryMap.set(r.id, r.category || ''); }

    const categoryCounts = new Map<string, number>();

    while (selected.length < Math.min(k, candidates.length)) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i];
        // diversity = max similarity to already selected (embedding)
        let maxSim = 0;
        for (const s of selected) {
          const sim = this.cosine(embedMap.get(cand.id), embedMap.get(s.id));
          if (sim > maxSim) maxSim = sim;
        }
        // category penalty: discourage selecting many items from same category
        const cat = categoryMap.get(cand.id) || '';
        const catCount = categoryCounts.get(cat) || 0;
        const catPenalty = 1 - Math.min(catCount * 0.2, 0.8); // each extra item reduces attractiveness

        const mmr = lambda * (cand.score * catPenalty) - (1 - lambda) * maxSim;
        if (mmr > bestScore) { bestScore = mmr; bestIdx = i; }
      }
      if (bestIdx === -1) break;
      const chosen = remaining.splice(bestIdx, 1)[0];
      selected.push(chosen);
      const chosenCat = categoryMap.get(chosen.id) || '';
      categoryCounts.set(chosenCat, (categoryCounts.get(chosenCat) || 0) + 1);
    }
    return selected;
  }

  // New: get recent interaction counts for given content ids (days window)
  private async getRecentInteractionCounts(days: number, contentIds: string[]) {
    if (contentIds.length === 0) return new Map<string, number>();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.userInteraction.groupBy({ by: ['contentId'], where: { contentId: { in: contentIds }, timestamp: { gte: since }, type: { in: [InteractionType.VIEW, InteractionType.CLICK, InteractionType.LIKE, InteractionType.COMPLETE] } }, _count: { contentId: true } });
    const map = new Map<string, number>();
    let max = 0;
    for (const r of rows) { map.set(r.contentId, r._count.contentId); if (r._count.contentId > max) max = r._count.contentId; }
    // normalize to 0..1
    for (const [k, v] of map.entries()) map.set(k, max > 0 ? v / max : 0);
    return map;
  }

  // New: scoring that includes recency boost and embedding similarity to user profile
  private async calculateContentScoreWithRecency(content: Content, prefs: UserPreferences, algorithm: string, recentCounts: Map<string, number>): Promise<number> {
    let score = 0;
    // base quality/popularity
    score += content.qualityScore * 0.35;
    score += content.popularityScore * 0.2;

    // user preference boosts
    if (prefs.favoriteCategories.includes(content.category)) score += 0.15;
    if (prefs.preferredContentTypes.includes(content.contentType)) score += 0.1;

    // recent popularity adjustment
    const recent = recentCounts.get(content.id) || 0;
    score += recent * 0.15;

    // freshness: newer content slightly preferred
    const ageDays = (Date.now() - new Date(content.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    const freshness = 1 / (1 + ageDays / 30); // 30-day half-effect
    score += freshness * 0.05;

    // embedding similarity to user's positive embedding (if available)
    const userEmbedding = await this.computeUserEmbedding(prefs.userId);
    const cEmb = ((content as any).embedding as number[] | undefined);
    if (userEmbedding && cEmb && cEmb.length > 0) {
      const sim = this.cosine(userEmbedding, cEmb);
      score += sim * 0.2; // embed similarity weight
    }

    // negative signals penalization
    const negative = await this.userNegativeSignals(prefs.userId);
    if (negative.contentIds.has(content.id)) score *= 0.2;
    if (negative.categories.has(content.category)) score *= 0.5;
    for (const t of content.tags) if (negative.tags.has(t)) score *= 0.8;

    return Math.min(Math.max(score, 0), 1);
  }

  // compute user embedding as average of liked/complete content embeddings
  private async computeUserEmbedding(userId: string): Promise<number[] | null> {
    // include full content to access embedding (generated types may not allow selecting embedding directly)
    const rows = await prisma.userInteraction.findMany({ where: { userId, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } }, include: { content: true }, take: 200 });
    const vectors: number[][] = [];
    for (const r of rows) { const emb = (r as any).content?.embedding as number[] | undefined; if (emb && emb.length > 0) vectors.push(emb); }
    if (vectors.length === 0) return null;
    const dim = vectors[0].length;
    const agg = new Array(dim).fill(0);
    for (const v of vectors) for (let i = 0; i < dim; i++) agg[i] += v[i];
    for (let i = 0; i < dim; i++) agg[i] /= vectors.length;
    return agg;
  }

  // collect negative signals: DISLIKE, SKIP, short dwell
  private async userNegativeSignals(userId: string) {
    const rows = await prisma.userInteraction.findMany({ where: { userId, type: { in: [InteractionType.DISLIKE, InteractionType.SKIP, InteractionType.VIEW] } }, include: { content: true }, take: 1000 });
    const contentIds = new Set<string>();
    const categories = new Set<string>();
    const tags = new Set<string>();
    for (const r of rows) {
      if (r.type === InteractionType.DISLIKE || r.type === InteractionType.SKIP) {
        contentIds.add(r.contentId);
        const ct = (r as any).content;
        if (ct) { categories.add(ct.category); ct.tags.forEach((t: string) => tags.add(t)); }
      }
      // short dwell heuristic: VIEW with very short duration/progress
      if (r.type === InteractionType.VIEW && r.duration && r.duration < 5) {
        contentIds.add(r.contentId);
        const ct = (r as any).content;
        if (ct) { categories.add(ct.category); ct.tags.forEach((t: string) => tags.add(t)); }
      }
    }
    return { contentIds, categories, tags };
  }

  // New: lightweight popularity update (EMA) — fire-and-forget to DB for top content candidates
  private async updatePopularityEstimates(updates: Map<string, number>) {
    if (updates.size === 0) return;
    const pairs = Array.from(updates.entries()).slice(0, 50); // limit writes
    for (const [contentId, recentNorm] of pairs) {
      // read current
      try {
        const c = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true, popularityScore: true } });
        if (!c) continue;
        const alpha = 0.2; // EMA weight
        const newPop = (1 - alpha) * (c.popularityScore || 0) + alpha * recentNorm;
        await prisma.content.update({ where: { id: contentId }, data: { popularityScore: newPop } });
      } catch (e) {
        // ignore individual update errors in fire-and-forget
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.warn('pop-update-fail', contentId, (e as any)?.message || e);
      }
    }
  }

  // New: post-process ranking — dedupe by very similar embeddings and cap same author/source
  private async postProcessRanking(list: (Omit<Recommendation, "id" | "createdAt" | "content" | "expiresAt"> & { expiresAt: Date })[]) {
    if (list.length === 0) return list;
    // fetch embeddings, authors
    const rows = await prisma.content.findMany({ where: { id: { in: list.map(l => l.contentId) } } });
    const embedMap = new Map<string, number[]>();
    const authorMap = new Map<string, string | null>();
    const sourceMap = new Map<string, string | null>();
    for (const r of rows) { embedMap.set(r.id, ((r as any).embedding || []) as number[]); authorMap.set(r.id, r.author || null); sourceMap.set(r.id, r.source || null); }

    const kept: typeof list = [];
    const seen = new Set<string>();
    const authorCounts = new Map<string | null, number>();
    for (const item of list) {
      if (seen.has(item.contentId)) continue;
      // dedupe by embedding similarity to already kept
      let dup = false;
      for (const k of kept) {
        const sim = this.cosine(embedMap.get(item.contentId), embedMap.get(k.contentId));
        if (sim > 0.95) { dup = true; break; }
      }
      if (dup) continue;
      // author cap
      const a = authorMap.get(item.contentId) ?? null;
      const cnt = authorCounts.get(a) || 0;
      if (a && cnt >= 2) continue; // cap 2 per author
      authorCounts.set(a, cnt + 1);
      kept.push(item);
      seen.add(item.contentId);
    }
    return kept;
  }
}

export const recommendationEngine = new WenzyRecommendationEngine();
