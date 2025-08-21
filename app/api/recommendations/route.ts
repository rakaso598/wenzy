import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { InteractionType, FeedbackType } from "@prisma/client";
import { recommendationEngine } from "@/lib/recommendation"; // integrated engine

// Recommendation API
// GET: fetch (and optionally refresh) personalized recommendations
// POST: log user interaction / feedback
// Safety: underlying engine filters unsafe categories/tags; extend with moderation later.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userId"); // incoming as email for now
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const refresh = searchParams.get("refresh") === "1"; // force regeneration

    if (!userEmail) {
      console.error('[API] userId 누락');
      return NextResponse.json({ success: false, error: "사용자 ID가 필요합니다", data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false } }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      console.error(`[API] 유저 없음: ${userEmail}`);
      return NextResponse.json({ success: false, error: "사용자를 찾을 수 없습니다", data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false } }, { status: 404 });
    }

    // Determine if regeneration needed
    let needRegenerate = refresh;
    let existing = [] as Awaited<ReturnType<typeof prisma.recommendation.findMany>>;
    if (!needRegenerate) {
      existing = await prisma.recommendation.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        include: { content: true },
        orderBy: { score: "desc" },
      });
      if (existing.length === 0) needRegenerate = true;
    }

    if (needRegenerate) {
      console.log(`[API] 추천 재생성: userId=${user.id}, limit=${limit}`);
      await recommendationEngine.generateRecommendations(user.id, limit);
      existing = await prisma.recommendation.findMany({
        where: { userId: user.id, expiresAt: { gt: new Date() } },
        include: { content: true },
        orderBy: { score: "desc" },
      });
    }

    // Pagination (in-memory as recommendation set is small)
    const offset = (page - 1) * limit;
    const slice = existing.slice(offset, offset + limit);

    // Mark shown
    await Promise.all(
      slice.map((rec) =>
        prisma.recommendation.update({ where: { id: rec.id }, data: { isShown: true } })
      )
    );

    console.log(`[API] 추천 반환: userId=${user.id}, count=${slice.length}, meta=`, {
      refreshed: needRegenerate,
      page,
      limit,
      total: existing.length,
      totalPages: Math.ceil(existing.length / limit) || 1,
      hasNext: offset + limit < existing.length,
      hasPrev: page > 1,
    });

    return NextResponse.json({
      success: true,
      data: slice,
      meta: {
        refreshed: needRegenerate,
        page,
        limit,
        total: existing.length,
        totalPages: Math.ceil(existing.length / limit) || 1,
        hasNext: offset + limit < existing.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("추천 콘텐츠 조회 중 오류:", error);
    return NextResponse.json({
      success: false,
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      error: "서버 오류가 발생했습니다"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, contentId, action } = body;

    if (!userId || !contentId || !action) {
      return NextResponse.json({ success: false, error: "필수 파라미터가 누락되었습니다" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    // Map action -> interaction / feedback
    let interactionType: InteractionType | undefined;
    let feedbackType: FeedbackType | undefined;
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
        return NextResponse.json({ success: false, error: "잘못된 액션입니다" }, { status: 400 });
    }

    if (interactionType) {
      await prisma.userInteraction.create({
        data: { userId: user.id, contentId, type: interactionType, timestamp: new Date() },
      });
    }

    if (feedbackType) {
      await prisma.feedback.upsert({
        where: { userId_contentId_type: { userId: user.id, contentId, type: feedbackType } },
        update: { timestamp: new Date() },
        create: { userId: user.id, contentId, type: feedbackType, timestamp: new Date() },
      });
    }

    if (action === "click") {
      await prisma.recommendation.updateMany({
        where: { userId: user.id, contentId },
        data: { isClicked: true },
      });
    }

    return NextResponse.json({ success: true, message: "상호작용이 기록되었습니다" });
  } catch (error) {
    console.error("상호작용 기록 중 오류:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
