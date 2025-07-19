# Wenzy - 왠지 당신이 좋아할 것 같은 것들을 보여주는 AI 큐레이션 서비스

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.12.0-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
</div>

## 🎯 프로젝트 소개

Wenzy는 "왠지 당신이 좋아할 것 같은 것들을 보여주는" AI 기반 큐레이션 서비스입니다. 사용자가 딱히 보고 싶은 게 없어도 접속했을 때, 개인화된 추천 알고리즘을 통해 다양한 콘텐츠를 큐레이션하여 제공합니다.

### ✨ 주요 특징

- **🎯 개인화된 추천**: 사용자의 취향과 행동 패턴을 분석한 맞춤형 콘텐츠 추천
- **🤝 협업 필터링**: 유사한 취향을 가진 사용자들의 선호도를 반영
- **🔍 탐험의 재미**: 가끔은 예상 밖의 카테고리에서도 추천하여 새로운 발견의 기회 제공
- **📱 모바일 퍼스트**: 모바일 환경에 최적화된 반응형 디자인
- **⚡ 실시간 학습**: 사용자 상호작용을 실시간으로 분석하여 추천 정확도 향상

## 🚀 기술 스택

### Frontend

- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안정성과 개발 생산성 향상
- **Tailwind CSS 4** - 유틸리티 퍼스트 CSS 프레임워크
- **Framer Motion** - 부드러운 애니메이션과 인터랙션
- **Lucide React** - 아이콘 라이브러리

### Backend

- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Prisma** - 타입 안전한 데이터베이스 ORM
- **PostgreSQL** - 관계형 데이터베이스

### AI/ML

- **콘텐츠 기반 필터링** - 콘텐츠 특성 기반 추천
- **협업 필터링** - 사용자 유사도 기반 추천
- **탐험-활용 균형** - 새로운 콘텐츠 발견과 기존 취향의 균형

## 📁 프로젝트 구조

```
wenzy/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   └── recommendations/ # 추천 API
│   ├── feed/              # 메인 피드 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 랜딩 페이지
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 및 핵심 로직
│   ├── db.ts             # 데이터베이스 연결
│   └── recommendation.ts # 추천 시스템 엔진
├── prisma/               # Prisma 스키마 및 마이그레이션
│   └── schema.prisma     # 데이터베이스 스키마
├── scripts/              # 개발 스크립트
│   └── seed-db.ts        # 샘플 데이터 생성
├── types/                # TypeScript 타입 정의
└── public/               # 정적 파일
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

## 📊 데이터베이스 스키마

### 주요 모델

- **User**: 사용자 정보
- **UserPreferences**: 사용자 취향 설정
- **Content**: 콘텐츠 정보
- **UserInteraction**: 사용자 상호작용 기록
- **Feedback**: 사용자 피드백
- **Recommendation**: 추천 결과

## 🔧 API 엔드포인트

### 추천 API

- `GET /api/recommendations` - 사용자별 추천 콘텐츠 조회
- `POST /api/recommendations` - 사용자 상호작용 기록

### 파라미터

- `userId`: 사용자 ID
- `page`: 페이지 번호
- `limit`: 한 번에 가져올 콘텐츠 수

## 🚀 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정 (`DATABASE_URL`)
4. 자동 배포 완료

### 수동 배포

```bash
npm run build
npm start
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

<div align="center">
  <p>Made with ❤️ for discovering amazing content</p>
  <p>Wenzy - 왠지 당신이 좋아할 것 같은 것들을 보여주는 서비스</p>
</div>
