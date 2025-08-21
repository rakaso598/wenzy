# Wenzy: AI 안전 추천 서비스

## 프로젝트 개요
Wenzy는 안전하고 신뢰할 수 있는 콘텐츠 추천을 목표로 하는 하이브리드 AI 추천 서비스입니다. 콘텐츠 기반, 협업 필터링, 탐험(Exploration) 전략을 결합하며, 안전성 필터링과 다양성, 신선도, 콜드스타트, 음수 피드백, 임베딩 기반 유사도, 오프라인 평가 루프 등 핵심 기능을 갖춘 MVP/베타 버전입니다.

## 주요 기능
- **하이브리드 추천**: 콘텐츠 기반 + 협업 + 탐험(신규/다양성)
- **안전성 필터링**: 위험/부적절 카테고리 및 태그 차단
- **음수 피드백 반영**: DISLIKE, SKIP, 짧은 VIEW 등 부정적 신호 감점
- **다양성(MMR)**: 임베딩/카테고리 분산, 중복 억제
- **신선도/인기도**: 최신성, 최근 상호작용, 동적 인기도(EMA)
- **콜드스타트**: 신규 사용자는 인기+탐험 혼합
- **랭킹 후처리**: 중복/저자 편향 제한
- **오프라인 평가**: Precision@K, Recall@K, NDCG@K 등 DB 저장
- **임베딩 파이프라인**: OpenAI/dummy 임베딩 지원
- **API/스크립트**: 추천, 임베딩 생성, 오프라인 평가 등

## 디렉토리 구조
- `lib/` : 추천 엔진, DB 유틸
- `app/api/` : API 라우트
- `prisma/` : Prisma 스키마, DB
- `scripts/` : 임베딩/평가/시드 스크립트
- `__tests__/` : Jest 테스트
- `README_DIR_GUIDE.md` : 폴더별 상세 가이드
- `ARCHITECTURE.md` : 전체 구조/흐름
- `SECURITY.md` : 안전성/보안 정책

## 빠른 시작
1. 의존성 설치: `npm install`
2. DB 준비/마이그레이션: `npx prisma db push && npx prisma generate`
3. 임베딩 생성: `npm run embeddings:gen`
4. 개발 서버: `npm run dev`
5. 오프라인 평가: `npm run eval:offline`
6. 테스트: `npx jest`

## 테스트
- `__tests__/recommendation.engine.test.ts` : 추천 엔진 핵심 기능(Jest)

## 참고 문서
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SECURITY.md](./SECURITY.md)
- [README_DIR_GUIDE.md](./README_DIR_GUIDE.md)

---

> MVP/베타 목적의 경량화된 구조로, 빠른 시장 검증과 사용자 피드백 수집에 최적화되어 있습니다.
