# Wenzy 추천 알고리즘 상세 설명

## 전체 구조
- **하이브리드 추천**: 콘텐츠 기반(임베딩/카테고리/태그), 협업 필터링, 탐험(미경험/신규/다양성) 조합
- **안전성**: 위험/부적절 카테고리 및 태그, isSafe 필드 기반 필터링
- **음수 피드백**: DISLIKE, SKIP, 짧은 VIEW 등 부정적 신호 감점
- **다양성(MMR)**: 임베딩 유사도, 카테고리 분산, 중복 억제
- **신선도/인기도**: 최신성, 최근 상호작용, 동적 인기도(EMA)
- **콜드스타트**: 신규 사용자는 인기+탐험 혼합
- **랭킹 후처리**: 중복/저자 편향 제한
- **오프라인 평가**: Precision@K, Recall@K, NDCG@K 등 DB 저장

## 주요 함수/로직
- `generateRecommendations(userId, limit)`: 전체 추천 파이프라인 진입점
- `contentBasedRecommendation`: 임베딩+카테고리+태그 유사도 기반 후보 선정
- `collaborativeRecommendation`: 유사 사용자 기반 협업 필터링
- `explorationRecommendation`: 미경험/신규/다양성 후보
- `calculateContentScoreWithRecency`: 품질, 인기도, 신선도, 임베딩 유사도, 음수 피드백 등 종합 점수 계산
- `selectWithMMR`: MMR(임베딩+카테고리 분산) 기반 다양성 보장
- `postProcessRanking`: 중복/저자 편향 제한, near-duplicate 제거
- `updatePopularityEstimates`: 최근 상호작용 기반 인기도 동적 업데이트(EMA)

## 임베딩 활용
- 각 콘텐츠는 embedding(Float[]) 필드에 임베딩 벡터 저장(OpenAI/dummy)
- 사용자는 LIKE/COMPLETE 콘텐츠 임베딩 평균으로 user profile vector 생성
- 추천 후보와 user profile 간 cosine similarity로 유사도 계산
- MMR, 중복 제거, 다양성 보장에도 임베딩 활용

## 음수 피드백/안전성
- DISLIKE, SKIP, 짧은 VIEW 등은 감점(콘텐츠/카테고리/태그별)
- BLOCKED_CATEGORY_KEYWORDS, BLOCKED_TAG_KEYWORDS, isSafe=false는 무조건 필터링

## 오프라인 평가
- `scripts/evaluate-offline.ts`에서 Precision@K, Recall@K, NDCG@K 산출 및 DB 저장
- 실험 파라미터(holdout, minPos 등)와 함께 OfflineMetric 테이블에 기록

## 예시 쿼리/활용
- API: `/api/recommendations?userId=...&limit=...`
- 오프라인 평가: `npm run eval:offline`
- 임베딩 생성: `npm run embeddings:gen`

## 참고
- [lib/recommendation.ts](./lib/recommendation.ts) 전체 구현 참고
- [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md) 구조/흐름 참고

---

> 본 알고리즘은 MVP/베타 목적의 경량화된 구조로, 빠른 실험과 시장 검증에 최적화되어 있습니다.
