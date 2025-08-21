#!/usr/bin/env tsx
/**
 * Embedding Generation Script (MVP)
 * - Fetches Content rows missing embedding
 * - Calls external embedding provider (placeholder) to compute vector
 * - Stores in `Content.embedding`
 *
 * Requirements:
 * - pgvector extension enabled (see prisma schema)
 * - ENV: EMBEDDING_PROVIDER=openai | dummy
 * - If openai: OPENAI_API_KEY must be set
 */
import { prisma } from "../lib/db";

const BATCH_SIZE = 25;

async function main() {
  const provider = process.env.EMBEDDING_PROVIDER || "dummy";
  console.log(`Embedding provider: ${provider}`);
  while (true) {
    const batch = await prisma.content.findMany({
      where: { isActive: true, isSafe: true },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });
    const pending = batch.filter(c => !c.embedding || c.embedding.length === 0);
    if (pending.length === 0) break;
    console.log(`Processing batch size=${pending.length}`);

    for (const c of pending) {
      try {
        const input = [c.title, c.description || "", c.tags.join(" ")].join(" \n");
        const vector = await embed(input, provider);
        await prisma.content.update({ where: { id: c.id }, data: { embedding: vector } });
      } catch (e) {
        console.error(`Failed embedding content=${c.id}`, e);
      }
    }
  }
  console.log("✅ Embedding generation complete.");
  process.exit(0);
}

async function embed(text: string, provider: string): Promise<number[]> {
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");
    // Lazy import to avoid dependency if not used
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
        input: text,
      }),
    });
    if (!resp.ok) {
      throw new Error(`OpenAI error: ${resp.status} ${await resp.text()}`);
    }
    const data = await resp.json();
    return data.data[0].embedding;
  }
  // Dummy provider: deterministic pseudo-random vector for local dev
  const dim = 1536;
  const out: number[] = new Array(dim);
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  for (let i = 0; i < dim; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out[i] = (seed % 1000) / 1000; // 0..0.999
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
