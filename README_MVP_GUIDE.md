# Wenzy MVP/베타 운영 가이드

## 목적
- 빠른 시장 검증, 사용자 피드백 수집, 핵심 기능 실험에 최적화된 경량화 구조
- 과도한 인프라/운영 자동화 없이, 필수 기능 중심의 실용적 운영

## 운영 체크리스트
- [x] DB 마이그레이션/스키마 최신화 (`npx prisma db push`)
- [x] 임베딩 생성 (`npm run embeddings:gen`)
- [x] 추천 엔진 동작 확인 (`/api/recommendations`)
- [x] 오프라인 평가 (`npm run eval:offline`)
- [x] 핵심 기능 테스트 (`npx jest`)
- [x] 안전성/음수 피드백/다양성/신선도/콜드스타트 등 필수 로직 반영

## 배포/운영
- 별도의 CI/CD, 배포 자동화 없이 수동 배포/운영 가능
- .env, DB, OpenAI 키 등 민감 정보는 로컬/서버 환경에 직접 관리
- 장애/버그 발생 시, 빠른 코드 수정 및 재배포 권장

## 문서/가이드
- [README.md](./README.md): 전체 개요/빠른 시작
- [ARCHITECTURE.md](./ARCHITECTURE.md): 구조/흐름
- [README_ALGORITHM.md](./README_ALGORITHM.md): 추천 알고리즘 상세
- [README_TESTING.md](./README_TESTING.md): 테스트/검증 가이드
- [README_DIR_GUIDE.md](./README_DIR_GUIDE.md): 폴더별 상세 설명
- [SECURITY.md](./SECURITY.md): 안전성/보안 정책

## 주의사항
- 본 프로젝트는 MVP/베타 목적의 경량화 구조로, 대규모 트래픽/운영에는 적합하지 않음
- Redis 등 외부 캐시 미사용, 모든 상태는 PostgreSQL 기반
- 추천 품질/성능 개선은 오프라인 평가 및 사용자 피드백 기반 반복 개선

---

> Wenzy는 빠른 실험과 시장 검증을 위한 AI 추천 MVP로, 실전 운영 전 추가 보완이 필요할 수 있습니다.
