import { recommendationEngine } from '../lib/recommendation';
import { prisma } from '../lib/db';

describe('추천 엔진 안전성 필터링', () => {
  let userId: string;
  let safeId: string;
  let unsafeId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: 'safeuser@example.com', name: 'Safe User' } });
    userId = user.id;
    const safe = await prisma.content.create({ data: { title: 'Clean Content', url: 'safe-url', contentType: 'ARTICLE', category: 'tech', tags: ['ai'], isSafe: true, source: 'test' } });
    safeId = safe.id;
    const unsafe = await prisma.content.create({ data: { title: 'NSFW', url: 'unsafe-url', contentType: 'ARTICLE', category: 'nsfw', tags: ['explicit'], isSafe: false, source: 'test' } });
    unsafeId = unsafe.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.content.deleteMany({ where: { id: { in: [safeId, unsafeId].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it('불안전 콘텐츠는 추천하지 않는다', async () => {
    const recs = await recommendationEngine.generateRecommendations(userId, 10);
    expect(recs.find(r => r.contentId === unsafeId)).toBeUndefined();
    expect(recs.find(r => r.contentId === safeId)).toBeDefined();
  });
});
