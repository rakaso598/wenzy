# Wenzy 테스트 및 검증 가이드

## 테스트 프레임워크
- **Jest**: 핵심 추천 엔진 및 안전성, 음수 피드백, 필터링 등 주요 기능 단위 테스트
- 테스트 위치: `__tests__/recommendation.engine.test.ts`, `__tests__/recommendation.safety.test.ts`

## 실행 방법
```
npx jest
```

## 주요 테스트 항목
- **추천 생성**: 추천 결과가 정상적으로 생성되는지, 배열/스코어/구조 확인
- **음수 피드백 반영**: DISLIKE/skip 등 부정적 상호작용이 감점에 반영되는지
- **안전성 필터링**: isSafe=false, 위험 카테고리/태그가 추천에서 제외되는지
- **다양성/중복 억제**: MMR, 카테고리 분산, near-duplicate 제거
- **콜드스타트**: 신규 사용자에 대한 인기+탐험 혼합 추천

## 예시 테스트 코드
- `recommendation.engine.test.ts`:
  - 추천 생성, 음수 피드백, 안전성 필터링 등 end-to-end 검증
- `recommendation.safety.test.ts`: 
  - 불안전 콘텐츠가 추천에 포함되지 않는지 검증

## 참고
- 테스트는 실제 DB를 사용하므로, 테스트 전용 DB 환경에서 실행 권장
- 테스트 후 데이터 정리(삭제) 코드 포함

---

> Wenzy는 MVP/베타 목적의 경량화된 구조로, 테스트 역시 핵심 기능 위주로 경량화되어 있습니다.
