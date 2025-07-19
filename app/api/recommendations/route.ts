import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recommendationEngine } from "@/lib/recommendation";
import { InteractionType, FeedbackType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "사용자 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 사용자 존재 확인 (이메일로 찾기)
    const user = await prisma.user.findUnique({
      where: { email: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 기존 추천이 없거나 만료된 경우 새로운 추천 생성
    const existingRecommendations = await prisma.recommendation.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      include: { content: true },
      orderBy: { score: "desc" },
    });

    let recommendations = existingRecommendations;

    if (existingRecommendations.length === 0) {
      // 임시로 모든 콘텐츠를 추천으로 사용 (테스트용)
      const allContents = await prisma.content.findMany({
        where: { isActive: true },
        orderBy: { qualityScore: "desc" },
        take: limit,
      });

      recommendations = allContents.map((content, index) => ({
        id: `temp-${index}`,
        userId: user.id,
        contentId: content.id,
        content,
        score: 0.8 - index * 0.05,
        reason: `테스트용 추천 콘텐츠입니다`,
        algorithm: "test",
        isShown: false,
        isClicked: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }));
    }

    // 페이지네이션 적용
    const offset = (page - 1) * limit;
    const paginatedRecommendations = recommendations.slice(
      offset,
      offset + limit
    );

    // 추천 표시 상태 업데이트 (실제 추천이 있는 경우에만)
    if (existingRecommendations.length > 0) {
      await Promise.all(
        paginatedRecommendations.map((rec) =>
          prisma.recommendation.update({
            where: { id: rec.id },
            data: { isShown: true },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: paginatedRecommendations,
      pagination: {
        page,
        limit,
        total: recommendations.length,
        totalPages: Math.ceil(recommendations.length / limit),
        hasNext: offset + limit < recommendations.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("추천 콘텐츠 조회 중 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, contentId, action } = body;

    if (!userId || !contentId || !action) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 사용자 존재 확인 (이메일로 찾기)
    const user = await prisma.user.findUnique({
      where: { email: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 사용자 상호작용 기록
    let interactionType;
    let feedbackType;

    switch (action) {
      case "like":
        interactionType = InteractionType.LIKE;
        feedbackType = FeedbackType.LIKE;
        break;
      case "dislike":
        interactionType = InteractionType.DISLIKE;
        feedbackType = FeedbackType.DISLIKE;
        break;
      case "click":
        interactionType = InteractionType.CLICK;
        break;
      case "view":
        interactionType = InteractionType.VIEW;
        break;
      case "skip":
        interactionType = InteractionType.SKIP;
        break;
      default:
        return NextResponse.json(
          { success: false, error: "잘못된 액션입니다" },
          { status: 400 }
        );
    }

    // 상호작용 기록 (실제 사용자 ID 사용)
    await prisma.userInteraction.create({
      data: {
        userId: user.id,
        contentId,
        type: interactionType,
        timestamp: new Date(),
      },
    });

    // 피드백이 있는 경우 기록 (실제 사용자 ID 사용)
    if (feedbackType) {
      await prisma.feedback.upsert({
        where: {
          userId_contentId_type: {
            userId: user.id,
            contentId,
            type: feedbackType,
          },
        },
        update: {
          timestamp: new Date(),
        },
        create: {
          userId: user.id,
          contentId,
          type: feedbackType,
          timestamp: new Date(),
        },
      });
    }

    // 추천 클릭 상태 업데이트 (실제 사용자 ID 사용)
    if (action === "click") {
      await prisma.recommendation.updateMany({
        where: {
          userId: user.id,
          contentId,
        },
        data: {
          isClicked: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "상호작용이 기록되었습니다",
    });
  } catch (error) {
    console.error("상호작용 기록 중 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
