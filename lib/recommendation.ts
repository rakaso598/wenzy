import { prisma } from "./db";
import type {
  Content,
  User,
  UserPreferences,
  Recommendation,
} from "@prisma/client";
import { InteractionType, FeedbackType } from "@prisma/client";

export interface RecommendationEngine {
  // 사용자별 추천 콘텐츠 생성
  generateRecommendations(
    userId: string,
    limit?: number
  ): Promise<Recommendation[]>;

  // 콘텐츠 기반 추천
  contentBasedRecommendation(
    userId: string,
    limit?: number
  ): Promise<Content[]>;

  // 협업 필터링 기반 추천
  collaborativeRecommendation(
    userId: string,
    limit?: number
  ): Promise<Content[]>;

  // 탐험 기반 추천 (새로운 콘텐츠)
  explorationRecommendation(userId: string, limit?: number): Promise<Content[]>;

  // 사용자 취향 분석
  analyzeUserPreferences(userId: string): Promise<UserPreferences>;

  // 콘텐츠 유사도 계산
  calculateContentSimilarity(content1: Content, content2: Content): number;
}

export class WenzyRecommendationEngine implements RecommendationEngine {
  // 메인 추천 생성 함수
  async generateRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<Recommendation[]> {
    try {
      // 사용자 취향 분석
      const preferences = await this.analyzeUserPreferences(userId);

      // 기존 추천 삭제 (새로운 추천으로 교체)
      await prisma.recommendation.deleteMany({
        where: { userId },
      });

      const recommendations: Recommendation[] = [];

      // 1. 콘텐츠 기반 추천 (60%)
      const contentBasedLimit = Math.floor(limit * 0.6);
      const contentBased = await this.contentBasedRecommendation(
        userId,
        contentBasedLimit
      );

      for (const content of contentBased) {
        const score = await this.calculateContentScore(
          userId,
          content,
          preferences
        );
        recommendations.push({
          id: "",
          userId,
          contentId: content.id,
          score,
          reason: `당신이 좋아하는 ${content.category} 카테고리의 콘텐츠입니다`,
          algorithm: "content-based",
          isShown: false,
          isClicked: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후 만료
        } as Recommendation);
      }

      // 2. 협업 필터링 추천 (20%)
      const collaborativeLimit = Math.floor(limit * 0.2);
      const collaborative = await this.collaborativeRecommendation(
        userId,
        collaborativeLimit
      );

      for (const content of collaborative) {
        const score = await this.calculateContentScore(
          userId,
          content,
          preferences
        );
        recommendations.push({
          id: "",
          userId,
          contentId: content.id,
          score: score * 0.9, // 협업 필터링은 약간 낮은 점수
          reason: `비슷한 취향을 가진 사용자들이 좋아하는 콘텐츠입니다`,
          algorithm: "collaborative",
          isShown: false,
          isClicked: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } as Recommendation);
      }

      // 3. 탐험 추천 (20%)
      const explorationLimit = limit - contentBasedLimit - collaborativeLimit;
      const exploration = await this.explorationRecommendation(
        userId,
        explorationLimit
      );

      for (const content of exploration) {
        const score =
          (await this.calculateContentScore(userId, content, preferences)) *
          0.7; // 탐험은 더 낮은 점수
        recommendations.push({
          id: "",
          userId,
          contentId: content.id,
          score,
          reason: `새로운 카테고리 ${content.category}의 인기 콘텐츠입니다`,
          algorithm: "exploration",
          isShown: false,
          isClicked: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } as Recommendation);
      }

      // 점수순으로 정렬
      recommendations.sort((a, b) => b.score - a.score);

      // 데이터베이스에 저장
      const savedRecommendations = await Promise.all(
        recommendations.map((rec) =>
          prisma.recommendation.create({
            data: {
              userId: rec.userId,
              contentId: rec.contentId,
              score: rec.score,
              reason: rec.reason,
              algorithm: rec.algorithm,
              expiresAt: rec.expiresAt,
            },
            include: { content: true },
          })
        )
      );

      return savedRecommendations;
    } catch (error) {
      console.error("추천 생성 중 오류:", error);
      return [];
    }
  }

  // 콘텐츠 기반 추천
  async contentBasedRecommendation(
    userId: string,
    limit: number = 10
  ): Promise<Content[]> {
    try {
      // 사용자의 과거 상호작용 분석
      const userInteractions = await prisma.userInteraction.findMany({
        where: { userId },
        include: { content: true },
        orderBy: { timestamp: "desc" },
        take: 100,
      });

      // 사용자가 좋아한 콘텐츠의 카테고리와 태그 분석
      const likedCategories = new Map<string, number>();
      const likedTags = new Map<string, number>();
      const likedContentTypes = new Map<string, number>();

      for (const interaction of userInteractions) {
        if (
          interaction.type === InteractionType.LIKE ||
          interaction.type === InteractionType.COMPLETE
        ) {
          // 카테고리 가중치 증가
          const categoryWeight =
            likedCategories.get(interaction.content.category) || 0;
          likedCategories.set(interaction.content.category, categoryWeight + 1);

          // 태그 가중치 증가
          for (const tag of interaction.content.tags) {
            const tagWeight = likedTags.get(tag) || 0;
            likedTags.set(tag, tagWeight + 1);
          }

          // 콘텐츠 타입 가중치 증가
          const typeWeight =
            likedContentTypes.get(interaction.content.contentType) || 0;
          likedContentTypes.set(
            interaction.content.contentType,
            typeWeight + 1
          );
        }
      }

      // 유사한 콘텐츠 찾기
      const similarContents = await prisma.content.findMany({
        where: {
          isActive: true,
          isProcessed: true,
          id: { notIn: userInteractions.map((i) => i.contentId) }, // 이미 본 콘텐츠 제외
        },
        orderBy: { qualityScore: "desc" },
        take: limit * 3, // 필터링 후 충분한 수를 얻기 위해 더 많이 가져옴
      });

      // 유사도 점수 계산 및 정렬
      const scoredContents = similarContents.map((content) => {
        let score = 0;

        // 카테고리 매칭
        const categoryWeight = likedCategories.get(content.category) || 0;
        score += categoryWeight * 2;

        // 태그 매칭
        for (const tag of content.tags) {
          const tagWeight = likedTags.get(tag) || 0;
          score += tagWeight;
        }

        // 콘텐츠 타입 매칭
        const typeWeight = likedContentTypes.get(content.contentType) || 0;
        score += typeWeight * 1.5;

        // 품질 점수 반영
        score += content.qualityScore * 10;

        return { content, score };
      });

      // 점수순 정렬 후 상위 콘텐츠 반환
      scoredContents.sort((a, b) => b.score - a.score);
      return scoredContents.slice(0, limit).map((item) => item.content);
    } catch (error) {
      console.error("콘텐츠 기반 추천 중 오류:", error);
      return [];
    }
  }

  // 협업 필터링 추천
  async collaborativeRecommendation(
    userId: string,
    limit: number = 5
  ): Promise<Content[]> {
    try {
      // 사용자와 유사한 취향을 가진 다른 사용자 찾기
      const userInteractions = await prisma.userInteraction.findMany({
        where: { userId },
        select: { contentId: true, type: true },
      });

      // 유사한 사용자 찾기 (간단한 구현)
      const similarUsers = await prisma.userInteraction.findMany({
        where: {
          contentId: { in: userInteractions.map((i) => i.contentId) },
          userId: { not: userId },
          type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] },
        },
        select: { userId: true, contentId: true },
        distinct: ["userId"],
      });

      if (similarUsers.length === 0) {
        return [];
      }

      // 유사한 사용자들이 좋아한 콘텐츠 중 사용자가 아직 보지 않은 것들
      const recommendedContents = await prisma.content.findMany({
        where: {
          isActive: true,
          isProcessed: true,
          id: {
            in: await prisma.userInteraction
              .findMany({
                where: {
                  userId: { in: similarUsers.map((u) => u.userId) },
                  type: {
                    in: [InteractionType.LIKE, InteractionType.COMPLETE],
                  },
                  contentId: {
                    notIn: userInteractions.map((i) => i.contentId),
                  },
                },
                select: { contentId: true },
                distinct: ["contentId"],
              })
              .then((interactions) => interactions.map((i) => i.contentId)),
          },
        },
        orderBy: { popularityScore: "desc" },
        take: limit,
      });

      return recommendedContents;
    } catch (error) {
      console.error("협업 필터링 추천 중 오류:", error);
      return [];
    }
  }

  // 탐험 추천 (새로운 콘텐츠)
  async explorationRecommendation(
    userId: string,
    limit: number = 5
  ): Promise<Content[]> {
    try {
      // 사용자가 선호하지 않는 카테고리에서 인기 콘텐츠 찾기
      const userPreferences = await this.analyzeUserPreferences(userId);

      const explorationContents = await prisma.content.findMany({
        where: {
          isActive: true,
          isProcessed: true,
          category: { notIn: userPreferences.favoriteCategories },
          qualityScore: { gte: 0.7 }, // 높은 품질의 콘텐츠만
          popularityScore: { gte: 0.5 }, // 어느 정도 인기도 있는 콘텐츠
        },
        orderBy: [{ popularityScore: "desc" }, { qualityScore: "desc" }],
        take: limit,
      });

      return explorationContents;
    } catch (error) {
      console.error("탐험 추천 중 오류:", error);
      return [];
    }
  }

  // 사용자 취향 분석
  async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // 기존 취향 설정 확인
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // 기본 취향 설정 생성
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            favoriteCategories: JSON.stringify(["tech", "entertainment"]),
            preferredContentTypes: JSON.stringify(["VIDEO", "ARTICLE"]),
            explorationRate: 0.2,
            excludeCategories: JSON.stringify([]),
          },
        });
      }

      // 사용자 상호작용을 기반으로 취향 업데이트
      const recentInteractions = await prisma.userInteraction.findMany({
        where: {
          userId,
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 최근 30일
        },
        include: { content: true },
      });

      if (recentInteractions.length > 0) {
        const categoryCounts = new Map<string, number>();
        const contentTypeCounts = new Map<string, number>();

        for (const interaction of recentInteractions) {
          if (
            interaction.type === InteractionType.LIKE ||
            interaction.type === InteractionType.COMPLETE
          ) {
            // 카테고리 카운트
            const categoryCount =
              categoryCounts.get(interaction.content.category) || 0;
            categoryCounts.set(interaction.content.category, categoryCount + 1);

            // 콘텐츠 타입 카운트
            const typeCount =
              contentTypeCounts.get(interaction.content.contentType) || 0;
            contentTypeCounts.set(
              interaction.content.contentType,
              typeCount + 1
            );
          }
        }

        // 상위 카테고리와 콘텐츠 타입 추출
        const topCategories = Array.from(categoryCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category]) => category);

        const topContentTypes = Array.from(contentTypeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type);

        // 취향 업데이트
        preferences = await prisma.userPreferences.update({
          where: { userId },
          data: {
            favoriteCategories:
              topCategories.length > 0
                ? JSON.stringify(topCategories)
                : preferences.favoriteCategories,
            preferredContentTypes:
              topContentTypes.length > 0
                ? JSON.stringify(topContentTypes)
                : preferences.preferredContentTypes,
          },
        });
      }

      return preferences;
    } catch (error) {
      console.error("사용자 취향 분석 중 오류:", error);
      // 기본값 반환
      return {
        id: "",
        userId,
        favoriteCategories: ["tech", "entertainment"],
        preferredContentTypes: ["VIDEO", "ARTICLE"],
        explorationRate: 0.2,
        excludeCategories: [],
        minContentLength: null,
        maxContentLength: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  // 콘텐츠 유사도 계산
  calculateContentSimilarity(content1: Content, content2: Content): number {
    let similarity = 0;

    // 카테고리 매칭
    if (content1.category === content2.category) {
      similarity += 0.4;
    }

    // 태그 매칭
    const commonTags = content1.tags.filter((tag) =>
      content2.tags.includes(tag)
    );
    similarity +=
      (commonTags.length /
        Math.max(content1.tags.length, content2.tags.length)) *
      0.3;

    // 콘텐츠 타입 매칭
    if (content1.contentType === content2.contentType) {
      similarity += 0.2;
    }

    // 언어 매칭
    if (content1.language === content2.language) {
      similarity += 0.1;
    }

    return similarity;
  }

  // 콘텐츠 점수 계산
  private async calculateContentScore(
    userId: string,
    content: Content,
    preferences: UserPreferences
  ): Promise<number> {
    let score = 0;

    // 기본 품질 점수
    score += content.qualityScore * 0.3;

    // 인기도 점수
    score += content.popularityScore * 0.2;

    // 사용자 취향 매칭
    if (preferences.favoriteCategories.includes(content.category)) {
      score += 0.3;
    }

    if (preferences.preferredContentTypes.includes(content.contentType)) {
      score += 0.2;
    }

    // 제외 카테고리 체크
    if (preferences.excludeCategories.includes(content.category)) {
      score *= 0.1; // 매우 낮은 점수
    }

    return Math.min(score, 1.0); // 최대 1.0
  }
}

// 싱글톤 인스턴스
export const recommendationEngine = new WenzyRecommendationEngine();
