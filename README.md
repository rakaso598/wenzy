# Wenzy - 왠지 당신이 좋아할 것 같은 것들을 보여주는 AI 큐레이션 서비스

<!-- PROJECT MISSION EXTENDED -->
> 안전하고 취향 맞춤형이며 폭력적·잔인·유해 요소를 제거한 건강한 발견 경험을 제공합니다. 접속만 해도 사용자가 과거에 명시/암시적으로 드러낸 선호를 바탕으로 안전성과 다양성을 균형 있게 고려한 추천을 제공합니다.

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.12.0-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
</div>

## 🎯 프로젝트 소개

Wenzy는 "왠지 당신이 좋아할 것 같은 것들을 보여주는" AI 기반 큐레이션 서비스입니다. 사용자가 딱히 보고 싶은 게 없어도 접속했을 때, 개인화된 추천 알고리즘을 통해 다양한 콘텐츠를 안전하게 큐레이션하여 제공합니다.

### ✨ 핵심 가치 (Core Values)

- **Safety First**: 폭력적/잔인/유해/노골적 콘텐츠 제외 (규칙 기반 + 추후 ML Moderation)
- **Personal Relevance**: 선호 카테고리/태그/콘텐츠 타입 반영
- **Healthy Exploration**: 과도하지 않은 탐험(Exploration)으로 새로운 관심사 발견
- **Performance & Consistency**: 빠른 응답, 예측 가능한 UX, 추후 모바일 앱 전환 용이성
- **Transparent Architecture**: 문서/주석을 통해 누구나 구조를 빠르게 파악 가능

### ✨ 주요 특징

- **🎯 개인화된 추천**: 사용자 상호작용 학습을 통한 맞춤형 선호 모델
- **🤝 협업 필터링(초기형)**: 유사 사용자 패턴 기반 보강
- **🔍 탐험 전략**: 선호하지 않은 카테고리에서도 일정 비율 신규 추천
- **🛡️ 안전 필터**: 금지 키워드 기반 1차 필터 (추후 ML 고도화)
- **📱 모바일 전환 대비**: API 구조화 및 향후 `/api/v1` 버전 도입 예정

## 🚀 기술 스택

### Frontend

- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안정성과 개발 생산성 향상
- **Tailwind CSS 4** - 유틸리티 퍼스트 CSS 프레임워크
- **Framer Motion** - 부드러운 애니메이션과 인터랙션
- **Lucide React** - 아이콘 라이브러리

### Backend / Infra

- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Prisma ORM** - 타입 안전한 데이터베이스 ORM
- **PostgreSQL** - 관계형 데이터베이스 (추천 메타/로그 저장)

### Recommendation (현재 MVP)

- **Hybrid**: 콘텐츠 기반 + 협업 + 탐험
- **안전 필터**: 카테고리/태그 키워드 블록
- 추후: 임베딩/벡터 검색 + ALS + Bandit + Moderation

문서 확장: `ARCHITECTURE.md`, `SECURITY.md`, `README_DIR_GUIDE.md` 참고

## 📁 프로젝트 구조

```
wenzy/
├── app/                    # Next.js App Router (페이지 & API)
│   └── api/recommendations # 추천 조회/상호작용 API
├── lib/                    # DB & 추천 엔진
├── prisma/                 # 데이터 스키마
├── scripts/                # 시드 & 배치 스크립트 베이스
├── types/                  # 타입 정의
├── ARCHITECTURE.md         # 아키텍처 개요
├── SECURITY.md             # 보안 & 안전 정책
└── README_DIR_GUIDE.md     # 디렉토리 가이드
```

## 🛠️ 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/wenzy.git
cd wenzy
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/wenzy"
```

### 4. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션 (PostgreSQL이 실행 중이어야 함)
npx prisma migrate dev

# 샘플 데이터 생성
npm run seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🔧 추천 API 요약

- `GET /api/recommendations?userId=<email>&limit=&page=&refresh=1` : 추천 목록 (refresh=1 시 재생성)
- `POST /api/recommendations` : `{ userId, contentId, action }` (like, dislike, click, view, skip)

## 🎨 주요 기능

### 1. 개인화된 추천 시스템

- **콘텐츠 기반 필터링**: 사용자가 과거에 좋아한 콘텐츠의 특성을 분석하여 유사한 콘텐츠 추천
- **협업 필터링**: 유사한 취향을 가진 사용자들이 좋아하는 콘텐츠 추천
- **탐험 추천**: 사용자가 선호하지 않는 카테고리에서도 인기 콘텐츠 추천

### 2. 실시간 상호작용 분석

- 좋아요/싫어요 버튼을 통한 명시적 피드백
- 콘텐츠 클릭, 시청 시간 등 암시적 피드백
- 사용자 취향의 지속적 학습 및 업데이트

### 3. 모바일 퍼스트 디자인

- 반응형 웹 디자인으로 모든 기기에서 최적화
- 무한 스크롤을 통한 부드러운 콘텐츠 탐색
- 직관적이고 아름다운 UI/UX

## 🧠 추천 엔진 (현재 동작)

파일: `lib/recommendation.ts`

- Content-based: 최근 LIKE/COMPLETE 상호작용 → 카테고리/태그/타입 빈도 가중치
- Collaborative: 유사 사용자(같은 긍정 상호작용 콘텐츠) → 그들이 좋아한 다른 콘텐츠
- Exploration: 선호 카테고리에 포함되지 않은 카테고리 중 품질/인기도 임계치 이상
- Scoring: 품질(qualityScore) + 인기도(popularityScore) + 취향 매칭 + 탐험 보정
- Safety Filter: 금지 키워드(category/tags)

## 🛡️ 안전 (Safety & Security)

요약 (전체는 `SECURITY.md`):

- 금지 카테고리/태그 필터 → 추후 ML Moderation + `content.isSafe`
- 개인 정보 최소화: 이메일 기반 사용자 식별, 삭제 시 연쇄 제거
- 추후: Rate Limiting, Audit Log, Moderation Queue

## 📱 향후 Android 전환 계획

- 동일 REST 계약 유지
- OAuth/JWT 토큰 기반 인증 모듈 추가 예정
- API 버전 관리(`/api/v1`) 도입 후 앱 안정성 확보
- 무한 스크롤 / 캐시 전략: 조건부 요청(ETag) + TTL 캐시

## 🧪 고도화 로드맵

| 단계 | 기능 | 설명 |
|------|------|------|
| P0 | Rate limiting | Abuse 방지 (Redis) |
| P0 | Embedding 파이프라인 | 텍스트 임베딩 + pgvector |
| P1 | ALS / implicit MF | 협업 필터링 정교화 |
| P1 | Moderation ML | 안전성 향상 |
| P1 | Offline Metrics | Precision@K, NDCG 계산 스크립트 |
| P2 | Bandit Exploration | CTR 기반 동적 탐험율 |
| P2 | Diversification | 카테고리/태그 다양성 확보 |
| P2 | A/B Testing Infra | 실험/롤아웃 속도 향상 |

## 🤝 기여 지침 (추가 규칙)

- 추천 알고리즘 변동 시: `ARCHITECTURE.md` & README 엔진 섹션 동시 갱신
- 스키마 변경: 마이그레이션 이유 `MIGRATION_LOG.md` (미생성 시 추가)
- 보안 영향 있는 PR: `SECURITY.md` 업데이트 필요

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---
<p align="center"><strong>Wenzy — 안전하고 똑똑한 취향 발견</strong></p>
