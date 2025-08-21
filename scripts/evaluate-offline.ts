#!/usr/bin/env tsx
/**
 * Offline Evaluation Script (Precision@K, Recall@K, NDCG@K)
 * Simplistic holdout approach:
 * 1. Split interactions per user by timestamp (last N = test, rest = train proxy)
 * 2. For each user with enough data, generate recommendations (current engine)
 * 3. Compare recommended contentIds vs test positives (LIKE/COMPLETE)
 * NOTE: This reuses live DB; ensure no side-effects beyond read + temp generation.
 */
import { prisma } from '../lib/db';
import { recommendationEngine } from '../lib/recommendation';
import { InteractionType } from '@prisma/client';
import { type Content, type Recommendation } from '@prisma/client';
import { Prisma } from '@prisma/client';

const TEST_REC_LIMIT = 20;
const HOLDOUT_COUNT = 3; // last N positive interactions as test set
const MIN_TOTAL_POSITIVE = 6; // require enough data
const K_VALUES = [5, 10, 20];

interface Metrics { precision: Record<number, number>; recall: Record<number, number>; ndcg: Record<number, number>; users: number; }

async function main() {
  const users = await prisma.user.findMany({ take: 200 });
  const aggregate: Metrics = { precision: {}, recall: {}, ndcg: {}, users: 0 };
  for (const k of K_VALUES) { aggregate.precision[k] = 0; aggregate.recall[k] = 0; aggregate.ndcg[k] = 0; }

  for (const u of users) {
    const positives = await prisma.userInteraction.findMany({
      where: { userId: u.id, type: { in: [InteractionType.LIKE, InteractionType.COMPLETE] } },
      orderBy: { timestamp: 'asc' },
    });
    if (positives.length < MIN_TOTAL_POSITIVE) continue;
    const test = positives.slice(-HOLDOUT_COUNT).map(p => p.contentId);
    if (test.length === 0) continue;

    // Generate current recommendations (will write DB; acceptable for MVP) - could be replaced with memory version
    const recs: (Recommendation & { content: Content | null })[] = await recommendationEngine.generateRecommendations(u.id, TEST_REC_LIMIT);
    const ranked = recs.map(r => r.contentId);

    aggregate.users += 1;

    for (const k of K_VALUES) {
      const topK = ranked.slice(0, k);
      const hits = topK.filter(id => test.includes(id));
      const precision = hits.length / k;
      const recall = hits.length / test.length;
      const ndcg = calcNDCG(topK, test);
      aggregate.precision[k] += precision;
      aggregate.recall[k] += recall;
      aggregate.ndcg[k] += ndcg;
    }
  }

  if (aggregate.users === 0) {
    console.log('No users with sufficient data.');
    return;
  }
  for (const k of K_VALUES) {
    aggregate.precision[k] /= aggregate.users;
    aggregate.recall[k] /= aggregate.users;
    aggregate.ndcg[k] /= aggregate.users;
  }

  const result = {
    users: aggregate.users,
    metrics: Object.fromEntries(K_VALUES.flatMap(k => [
      [`P@${k}`, Number(aggregate.precision[k].toFixed(4))],
      [`R@${k}`, Number(aggregate.recall[k].toFixed(4))],
      [`NDCG@${k}`, Number(aggregate.ndcg[k].toFixed(4))],
    ])),
    runAt: new Date().toISOString(),
  };

  console.table({ users: aggregate.users, ...Object.fromEntries(K_VALUES.map(k => ([`P@${k}`, aggregate.precision[k].toFixed(3)]))), ...Object.fromEntries(K_VALUES.map(k => ([`R@${k}`, aggregate.recall[k].toFixed(3)]))), ...Object.fromEntries(K_VALUES.map(k => ([`NDCG@${k}`, aggregate.ndcg[k].toFixed(3)]))), });

  // Persist the aggregated metrics to the database for later inspection
  try {
    await prisma.offlineMetric.create({ data: { metrics: result.metrics as Prisma.JsonObject, note: `holdout=${HOLDOUT_COUNT} minPos=${MIN_TOTAL_POSITIVE} users=${aggregate.users}` } });
    console.log('Saved OfflineMetric to DB.');
  } catch (e) {
    console.warn('Failed to save OfflineMetric', (e as Error)?.message || e);
  }
}

function calcNDCG(ranked: string[], relevant: string[]): number {
  let dcg = 0;
  for (let i = 0; i < ranked.length; i++) {
    if (relevant.includes(ranked[i])) {
      const rel = 1; // binary relevance
      dcg += rel / Math.log2(i + 2);
    }
  }
  // Ideal DCG
  const idealCount = Math.min(relevant.length, ranked.length);
  let idcg = 0;
  for (let i = 0; i < idealCount; i++) idcg += 1 / Math.log2(i + 2);
  return idcg === 0 ? 0 : dcg / idcg;
}

main().catch(e => { console.error(e); process.exit(1); });
