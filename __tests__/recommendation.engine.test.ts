import { recommendationEngine } from '../lib/recommendation';
import { prisma } from '../lib/db';
import { InteractionType } from '@prisma/client';

describe('WenzyRecommendationEngine', () => {
  let userId: string;
  let contentIds: string[];

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: { email: 'testuser@example.com', name: 'Test User' },
    });
    userId = user.id;
    // Create test content
    const contents = await prisma.content.createMany({
      data: [
        { title: 'AI News', url: 'url1', contentType: 'ARTICLE', category: 'tech', tags: ['ai'], isSafe: true, source: 'test' },
        { title: 'Music Trends', url: 'url2', contentType: 'ARTICLE', category: 'music', tags: ['pop'], isSafe: true, source: 'test' },
        { title: 'Travel Guide', url: 'url3', contentType: 'ARTICLE', category: 'travel', tags: ['asia'], isSafe: true, source: 'test' },
      ],
      skipDuplicates: true,
    });
    // Fetch content IDs
    const all = await prisma.content.findMany({ where: { url: { in: ['url1', 'url2', 'url3'] } } });
    contentIds = all.map(c => c.id);
    // Simulate user interactions
    await prisma.userInteraction.create({ data: { userId, contentId: contentIds[0], type: InteractionType.LIKE } });
    await prisma.userInteraction.create({ data: { userId, contentId: contentIds[1], type: InteractionType.DISLIKE } });
  });

  afterAll(async () => {
    await prisma.userInteraction.deleteMany({ where: { userId } });
    await prisma.recommendation.deleteMany({ where: { userId } });
    await prisma.userPreferences.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.content.deleteMany({ where: { id: { in: contentIds.filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it('generates recommendations for a user', async () => {
    const recs = await recommendationEngine.generateRecommendations(userId, 5);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    // Should not recommend disliked content (score should be very low if present)
    const disliked = recs.find(r => r.contentId === contentIds[1]);
    expect(!disliked || (disliked && disliked.score <= 0.2)).toBe(true);
    // Should recommend liked or similar content
    const liked = recs.find(r => r.contentId === contentIds[0]);
    expect(liked).toBeDefined();
  });

  it('applies safety filtering', async () => {
    // Add unsafe content
    const unsafe = await prisma.content.create({
      data: { title: 'Violence News', url: 'url4', contentType: 'ARTICLE', category: 'violence', tags: ['violent'], isSafe: false, source: 'test' },
    });
    const recs = await recommendationEngine.generateRecommendations(userId, 10);
    expect(recs.find(r => r.contentId === unsafe.id)).toBeUndefined();
    await prisma.content.delete({ where: { id: unsafe.id } });
  });
});
