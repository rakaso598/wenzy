// Wenzy 서비스 타입 정의

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  id: string;
  userId: string;
  favoriteCategories: string[];
  preferredContentTypes: string[];
  explorationRate: number;
  excludeCategories: string[];
  minContentLength?: number;
  maxContentLength?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Content {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  contentType: ContentType;
  category: string;
  tags: string[];
  language: string;
  duration?: number;
  wordCount?: number;
  source: string;
  sourceId?: string;
  author?: string;
  qualityScore: number;
  popularityScore: number;
  isActive: boolean;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recommendation {
  id: string;
  userId: string;
  contentId: string;
  content: Content;
  score: number;
  reason?: string;
  algorithm: string;
  isShown: boolean;
  isClicked: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserInteraction {
  id: string;
  userId: string;
  contentId: string;
  type: InteractionType;
  duration?: number;
  progress?: number;
  timestamp: Date;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  contentId: string;
  type: FeedbackType;
  rating?: number;
  comment?: string;
  timestamp: Date;
}

export enum ContentType {
  VIDEO = "VIDEO",
  ARTICLE = "ARTICLE",
  IMAGE = "IMAGE",
  PODCAST = "PODCAST",
  SOCIAL_POST = "SOCIAL_POST",
  NEWS = "NEWS",
  BLOG = "BLOG",
  OTHER = "OTHER",
}

export enum InteractionType {
  VIEW = "VIEW",
  CLICK = "CLICK",
  LIKE = "LIKE",
  DISLIKE = "DISLIKE",
  SHARE = "SHARE",
  BOOKMARK = "BOOKMARK",
  COMPLETE = "COMPLETE",
  SKIP = "SKIP",
}

export enum FeedbackType {
  LIKE = "LIKE",
  DISLIKE = "DISLIKE",
  RATING = "RATING",
  COMMENT = "COMMENT",
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 추천 알고리즘 타입
export type RecommendationAlgorithm =
  | "collaborative"
  | "content-based"
  | "exploration"
  | "trending"
  | "random";

// 콘텐츠 소스 타입
export type ContentSource =
  | "youtube"
  | "blog"
  | "news"
  | "instagram"
  | "twitter"
  | "pinterest"
  | "reddit"
  | "medium"
  | "tiktok"
  | "other";

// 사용자 세션 타입
export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
