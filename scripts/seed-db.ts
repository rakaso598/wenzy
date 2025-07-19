// 현재 사용되지 않는 시딩 스크립트 (seed-db-sqlite.ts 사용)
/*
import { PrismaClient, ContentType, InteractionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 데이터베이스 시드 시작...");

  // 샘플 사용자 생성
  const user = await prisma.user.upsert({
    where: { email: "demo@wenzy.com" },
    update: {},
    create: {
      email: "demo@wenzy.com",
      name: "데모 사용자",
    },
  });

  console.log("✅ 사용자 생성 완료:", user.email);

  // 사용자 취향 설정 생성
  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      favoriteCategories: JSON.stringify([
        "tech",
        "entertainment",
        "food",
        "travel",
      ]),
      preferredContentTypes: JSON.stringify(["VIDEO", "ARTICLE", "IMAGE"]),
      explorationRate: 0.2,
      excludeCategories: JSON.stringify([]),
    },
  });

  console.log("✅ 사용자 취향 설정 완료");

  // 샘플 콘텐츠 데이터
  const sampleContents = [
    {
      title: "최신 AI 기술 동향: GPT-5와 미래의 AI",
      description:
        "OpenAI의 최신 AI 모델과 향후 AI 기술의 발전 방향에 대해 알아봅니다.",
      url: "https://example.com/ai-trends-2024",
      thumbnail:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
      contentType: ContentType.VIDEO,
      category: "tech",
      tags: ["AI", "GPT-5", "기술", "미래"],
      language: "ko",
      duration: 1200, // 20분
      source: "youtube",
      sourceId: "yt_ai_trends_2024",
      author: "테크리뷰",
      qualityScore: 0.9,
      popularityScore: 0.8,
    },
    {
      title: "한국의 숨겨진 맛집 10곳",
      description:
        "SNS에서 화제가 된 숨겨진 맛집들을 소개합니다. 예약이 어려운 곳들만 엄선했습니다.",
      url: "https://example.com/hidden-restaurants-korea",
      thumbnail:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
      contentType: ContentType.ARTICLE,
      category: "food",
      tags: ["맛집", "한국", "음식", "여행"],
      language: "ko",
      wordCount: 2500,
      source: "blog",
      sourceId: "blog_food_korea",
      author: "푸드리포터",
      qualityScore: 0.8,
      popularityScore: 0.7,
    },
    {
      title: "일본 오사카 자유여행 가이드",
      description:
        "첫 일본 여행자를 위한 오사카 완벽 가이드. 교통, 숙박, 맛집까지 모든 정보를 담았습니다.",
      url: "https://example.com/osaka-travel-guide",
      thumbnail:
        "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop",
      contentType: ContentType.ARTICLE,
      category: "travel",
      tags: ["일본", "오사카", "여행", "가이드"],
      language: "ko",
      wordCount: 3500,
      source: "blog",
      sourceId: "blog_travel_osaka",
      author: "트래블러",
      qualityScore: 0.85,
      popularityScore: 0.75,
    },
    {
      title: "넷플릭스 신작 드라마 추천 TOP 5",
      description:
        "2024년 상반기 넷플릭스에서 꼭 봐야 할 신작 드라마들을 소개합니다.",
      url: "https://example.com/netflix-drama-2024",
      thumbnail:
        "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=300&fit=crop",
      contentType: ContentType.VIDEO,
      category: "entertainment",
      tags: ["넷플릭스", "드라마", "추천", "2024"],
      language: "ko",
      duration: 900, // 15분
      source: "youtube",
      sourceId: "yt_netflix_2024",
      author: "엔터테인먼트리뷰",
      qualityScore: 0.75,
      popularityScore: 0.9,
    },
    {
      title: "최신 스마트폰 비교: 아이폰 15 vs 갤럭시 S24",
      description:
        "2024년 최신 플래그십 스마트폰들의 성능과 기능을 상세히 비교해봅니다.",
      url: "https://example.com/iphone15-vs-galaxy-s24",
      thumbnail:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop",
      contentType: ContentType.VIDEO,
      category: "tech",
      tags: ["스마트폰", "아이폰", "갤럭시", "비교"],
      language: "ko",
      duration: 1800, // 30분
      source: "youtube",
      sourceId: "yt_phone_comparison",
      author: "테크리뷰",
      qualityScore: 0.9,
      popularityScore: 0.85,
    },
    {
      title: "집에서 만드는 건강한 아침 식단",
      description:
        "바쁜 아침에도 쉽게 만들 수 있는 건강한 아침 식단 레시피를 소개합니다.",
      url: "https://example.com/healthy-breakfast-recipes",
      thumbnail:
        "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?w=400&h=300&fit=crop",
      contentType: ContentType.ARTICLE,
      category: "food",
      tags: ["레시피", "아침", "건강", "식단"],
      language: "ko",
      wordCount: 1800,
      source: "blog",
      sourceId: "blog_breakfast_recipes",
      author: "쿡쿡",
      qualityScore: 0.8,
      popularityScore: 0.6,
    },
    {
      title: "서울 근교 힐링 여행지 추천",
      description:
        "서울에서 1-2시간 거리의 아름다운 힐링 여행지들을 소개합니다.",
      url: "https://example.com/seoul-healing-travel",
      thumbnail:
        "https://images.unsplash.com/photo-1538485399081-7c8ce5a93c61?w=400&h=300&fit=crop",
      contentType: ContentType.IMAGE,
      category: "travel",
      tags: ["서울", "근교", "힐링", "여행"],
      language: "ko",
      source: "instagram",
      sourceId: "ig_travel_seoul",
      author: "여행인스타",
      qualityScore: 0.7,
      popularityScore: 0.8,
    },
    {
      title: "2024년 최고의 게임 TOP 10",
      description:
        "2024년 상반기에 출시된 최고의 게임들을 플랫폼별로 정리했습니다.",
      url: "https://example.com/best-games-2024",
      thumbnail:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop",
      contentType: ContentType.VIDEO,
      category: "entertainment",
      tags: ["게임", "2024", "추천", "TOP10"],
      language: "ko",
      duration: 1500, // 25분
      source: "youtube",
      sourceId: "yt_games_2024",
      author: "게임리뷰",
      qualityScore: 0.85,
      popularityScore: 0.9,
    },
    {
      title: "집에서 할 수 있는 홈트레이닝 루틴",
      description:
        "운동기구 없이도 집에서 효과적으로 할 수 있는 홈트레이닝 루틴을 소개합니다.",
      url: "https://example.com/home-workout-routine",
      thumbnail:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
      contentType: ContentType.VIDEO,
      category: "health",
      tags: ["홈트", "운동", "피트니스", "루틴"],
      language: "ko",
      duration: 1200, // 20분
      source: "youtube",
      sourceId: "yt_home_workout",
      author: "피트니스코치",
      qualityScore: 0.8,
      popularityScore: 0.7,
    },
    {
      title: "최신 웹 개발 트렌드 2024",
      description:
        "2024년 웹 개발 분야의 주요 트렌드와 기술 동향을 분석해봅니다.",
      url: "https://example.com/web-dev-trends-2024",
      thumbnail:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
      contentType: ContentType.ARTICLE,
      category: "tech",
      tags: ["웹개발", "트렌드", "2024", "기술"],
      language: "ko",
      wordCount: 3000,
      source: "blog",
      sourceId: "blog_web_dev_2024",
      author: "개발자블로그",
      qualityScore: 0.9,
      popularityScore: 0.75,
    },
  ];

  // 콘텐츠 생성
  const createdContents = [];
  for (const contentData of sampleContents) {
    const content = await prisma.content.upsert({
      where: { url: contentData.url },
      update: {},
      create: {
        ...contentData,
        isActive: true,
        isProcessed: true,
      },
    });
    createdContents.push(content);
    console.log(`✅ 콘텐츠 생성: ${content.title}`);
  }

  // 샘플 사용자 상호작용 생성
  const sampleInteractions = [
    { contentId: createdContents[0].id, type: "LIKE" },
    { contentId: createdContents[1].id, type: "COMPLETE" },
    { contentId: createdContents[2].id, type: "LIKE" },
    { contentId: createdContents[3].id, type: "VIEW" },
    { contentId: createdContents[4].id, type: "LIKE" },
  ];

  for (const interaction of sampleInteractions) {
    await prisma.userInteraction.create({
      data: {
        userId: user.id,
        contentId: interaction.contentId,
        type: interaction.type as InteractionType,
        timestamp: new Date(),
      },
    });
  }

  console.log("✅ 사용자 상호작용 생성 완료");

  console.log("🎉 데이터베이스 시드 완료!");
  console.log(`📊 생성된 데이터:`);
  console.log(`   - 사용자: 1명`);
  console.log(`   - 콘텐츠: ${createdContents.length}개`);
  console.log(`   - 상호작용: ${sampleInteractions.length}개`);
}

main()
  .catch((e) => {
    console.error("❌ 시드 중 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
*/
