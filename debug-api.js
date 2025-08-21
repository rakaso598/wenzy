const { PrismaClient } = require('@prisma/client');

async function debugAPI() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DB 연결 테스트 ===');
    
    // 1. 유저 확인
    const user = await prisma.user.findUnique({ 
      where: { email: 'demo@wenzy.com' } 
    });
    console.log('User found:', user ? `ID: ${user.id}, Email: ${user.email}` : 'NOT FOUND');
    
    if (!user) {
      console.log('Creating demo user...');
      const newUser = await prisma.user.create({
        data: {
          email: 'demo@wenzy.com',
          name: 'Demo User',
          preferences: {}
        }
      });
      console.log('Created user:', newUser);
    }
    
    // 2. 콘텐츠 개수 확인
    const contentCount = await prisma.content.count();
    console.log('Total content count:', contentCount);
    
    // 3. 추천 개수 확인
    const recCount = await prisma.recommendation.count({
      where: { userId: user?.id || '' }
    });
    console.log('Recommendation count for user:', recCount);
    
    // 4. API 로직 시뮬레이션
    console.log('\n=== API 로직 시뮬레이션 ===');
    const userEmail = 'demo@wenzy.com';
    const limit = 10;
    const page = 1;
    
    const foundUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!foundUser) {
      console.log('ERROR: User not found');
      return;
    }
    
    let existing = await prisma.recommendation.findMany({
      where: { userId: foundUser.id, expiresAt: { gt: new Date() } },
      include: { content: true },
      orderBy: { score: "desc" },
    });
    
    console.log('Existing recommendations:', existing.length);
    
    if (existing.length === 0) {
      console.log('No recommendations found, need to generate...');
    }
    
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPI();
