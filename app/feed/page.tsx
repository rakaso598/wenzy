"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart,
  ThumbsDown,
  Share2,
  ExternalLink,
  Play,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";

interface Content {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  contentType:
  | "VIDEO"
  | "ARTICLE"
  | "IMAGE"
  | "PODCAST"
  | "SOCIAL_POST"
  | "NEWS"
  | "BLOG"
  | "OTHER";
  category: string;
  tags: string[];
  source: string;
  author?: string;
  duration?: number;
  wordCount?: number;
}

interface Recommendation {
  id: string;
  content: Content;
  score: number;
  reason?: string;
  algorithm: string;
}

interface FeedResponse {
  success: boolean;
  data: Recommendation[];
  error?: string;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    refreshed?: boolean;
  };
}

export default function FeedPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const userId = "demo@wenzy.com"; // 시딩에서 생성한 사용자 ID

  // 추천 콘텐츠 로드
  const loadRecommendations = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        const isInitialLoad = pageNum === 1;
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await fetch(
          `/api/recommendations?userId=${userId}&page=${pageNum}&limit=10`
        );

        // 응답이 정상적인지 먼저 확인
        if (!response.ok) {
          console.error('API 응답 에러:', response.status, response.statusText);
          setHasNext(false);
          setPage(1);
          if (!append) setRecommendations([]);
          return;
        }

        const responseText = await response.text();
        console.log('Raw API response:', responseText);

        let data: FeedResponse;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON 파싱 에러:', parseError, 'Raw response:', responseText);
          setHasNext(false);
          setPage(1);
          if (!append) setRecommendations([]);
          return;
        }

        console.log('Parsed API data:', data);

        // meta가 undefined이거나 잘못된 경우 에러 메시지 표시
        if (!data || typeof data !== 'object' || !data.meta) {
          console.error('API 응답에 meta가 없음:', data);
          setHasNext(false);
          setPage(1);
          if (!append) setRecommendations([]);
          alert('추천 API 응답에 meta 정보가 없습니다. 서버 로그와 DB 상태를 확인하세요.');
          return;
        }

        if (data.success && data.data) {
          if (append) {
            setRecommendations((prev) => [...prev, ...data.data]);
          } else {
            setRecommendations(data.data);
          }

          // meta 안전 처리
          const meta = data.meta || {};
          const hasNextValue = typeof meta.hasNext === 'boolean' ? meta.hasNext : false;
          const pageValue = typeof meta.page === 'number' ? meta.page : pageNum;

          setHasNext(hasNextValue);
          setPage(pageValue);

          console.log('Set hasNext:', hasNextValue, 'page:', pageValue);
        } else {
          console.error("추천 로드 실패:", data.error || '알 수 없는 오류', data);
          setHasNext(false);
          setPage(1);
          if (!append) setRecommendations([]);
        }
      } catch (error) {
        console.error("추천 로드 중 오류:", error);
        setHasNext(false);
        setPage(1);
        if (!append) setRecommendations([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  // 사용자 상호작용 기록
  const recordInteraction = async (contentId: string, action: string) => {
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          contentId,
          action,
        }),
      });
    } catch (error) {
      console.error("상호작용 기록 실패:", error);
    }
  };

  // 콘텐츠 타입별 아이콘
  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "VIDEO":
        return <Play className="w-4 h-4" />;
      case "ARTICLE":
      case "BLOG":
      case "NEWS":
        return <BookOpen className="w-4 h-4" />;
      case "IMAGE":
      case "SOCIAL_POST":
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  // 콘텐츠 타입별 색상
  const getContentColor = (contentType: string) => {
    switch (contentType) {
      case "VIDEO":
        return "bg-red-100 text-red-600";
      case "ARTICLE":
      case "BLOG":
      case "NEWS":
        return "bg-blue-100 text-blue-600";
      case "IMAGE":
      case "SOCIAL_POST":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // 초기 로드
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // 무한 스크롤
  const handleScroll = useCallback(() => {
    if (loading || loadingMore || !hasNext) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 100) {
      loadRecommendations(page + 1, true);
    }
  }, [loading, loadingMore, hasNext, page, loadRecommendations]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            왠지 당신이 좋아할 것 같은 콘텐츠를 찾고 있어요...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Wenzy
              </h1>
              <p className="text-sm text-gray-600">
                왠지 당신이 좋아할 것 같은 것들
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={recommendation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* 콘텐츠 카드 */}
              <div className="p-6">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getContentColor(
                        recommendation.content.contentType
                      )}`}
                    >
                      {getContentIcon(recommendation.content.contentType)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {recommendation.content.source}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {recommendation.content.category}
                        </span>
                      </div>
                      {recommendation.content.author && (
                        <p className="text-xs text-gray-500">
                          by {recommendation.content.author}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      {recommendation.algorithm === "content-based" &&
                        "🎯 취향 기반"}
                      {recommendation.algorithm === "collaborative" &&
                        "👥 유사 사용자"}
                      {recommendation.algorithm === "exploration" &&
                        "🔍 새로운 발견"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {Math.round(recommendation.score * 100)}% 매칭
                    </div>
                  </div>
                </div>

                {/* 썸네일 */}
                {recommendation.content.thumbnail && (
                  <div className="mb-4">
                    <Image
                      src={recommendation.content.thumbnail}
                      alt={recommendation.content.title}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* 제목 */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {recommendation.content.title}
                </h2>

                {/* 설명 */}
                {recommendation.content.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {recommendation.content.description}
                  </p>
                )}

                {/* 추천 이유 */}
                {recommendation.reason && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">
                      💡 {recommendation.reason}
                    </p>
                  </div>
                )}

                {/* 메타 정보 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {recommendation.content.duration && (
                      <span>
                        ⏱️ {Math.floor(recommendation.content.duration / 60)}분
                      </span>
                    )}
                    {recommendation.content.wordCount && (
                      <span>📝 {recommendation.content.wordCount}자</span>
                    )}
                    <span>
                      🏷️ {recommendation.content.tags.slice(0, 3).join(", ")}
                    </span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        recordInteraction(recommendation.content.id, "like")
                      }
                      className="flex items-center space-x-1 px-4 py-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">좋아요</span>
                    </button>
                    <button
                      onClick={() =>
                        recordInteraction(recommendation.content.id, "dislike")
                      }
                      className="flex items-center space-x-1 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-sm font-medium">싫어요</span>
                    </button>
                  </div>
                  <a
                    href={recommendation.content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      recordInteraction(recommendation.content.id, "click")
                    }
                    className="flex items-center space-x-1 px-4 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">보기</span>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 로딩 인디케이터 */}
        {loadingMore && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">더 많은 콘텐츠를 찾고 있어요...</p>
          </div>
        )}

        {/* 더 이상 콘텐츠가 없을 때 */}
        {!hasNext && recommendations.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              오늘의 추천 콘텐츠를 모두 확인하셨네요! 🎉
            </p>
            <p className="text-sm text-gray-400 mt-2">
              내일 더 좋은 콘텐츠로 돌아올게요
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
