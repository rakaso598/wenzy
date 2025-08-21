# Wenzy Architecture & Recommendation System Overview

## Vision
Provide a safe, fast, personalized content discovery experience. No violent/explicit content. Consistent design and future-ready for Android app integration.

## High-Level Components
```
+-------------+       +----------------------+       +------------------+
| Next.js App | <---> | API Routes (Edge/SSR) | <---> | PostgreSQL (Prisma)|
+-------------+       +----------------------+       +------------------+
        |                       |                              |
        |                       +--> Recommendation Engine      |
        |                       |    (Hybrid + Safety Filter)  |
        |                       |                              |
        |                       +--> Future: Vector Store /    |
        |                       |             Embeddings       |
        |                                                      |
        +--> Client UI (Feed, Interactions)                    |
```

## Data Flow (Recommendations)
1. User opens feed -> front-end calls `GET /api/recommendations?userId=<email>`.
2. API resolves user, checks existing non-expired recommendations.
3. If missing or refresh requested -> engine generates hybrid set:
   - Content-based (interaction-derived similarities)
   - Collaborative (other similar users' liked items)
   - Exploration (novel categories)
4. Safety filter removes blocked categories/tags.
5. Recommendations persisted (upsert) with reason & algorithm metadata.
6. Client displays list; interactions posted via `POST /api/recommendations`.
7. Interaction & feedback events feed back into preference adaptation.

## Recommendation Engine (Current MVP)
- Implemented in `lib/recommendation.ts`.
- Hybrid weighting: 60% content-based, 20% collaborative, 20% exploration (implicit remainder).
- Safety: rule-based filtering (blocked keyword arrays) - to be extended.
- Preference Adaptation: updates `UserPreferences` from last 30 days LIKE/COMPLETE interactions.
- Scoring: qualityScore + popularity + preference matches + exploration boost.

## Planned Enhancements
| Area | Enhancement | Notes |
|------|-------------|-------|
| Content Similarity | Embedding-based semantic vectors | Add pgvector extension / external vector DB |
| Collaborative | ALS / implicit MF | Nightly batch job (Python `implicit` library) |
| Safety | ML moderation (OpenAI / custom) | Persist `isSafe` flag & reason |
| Diversity | MMR / category spread | Post-ranking diversification step |
| Ranking | Learning-to-Rank (LambdaMART / XGBoost) | Feature store: (content, user, interaction stats) |
| Exploration | Multi-armed bandits (UCB / Thompson) | Track reward (CTR) per bucket |
| Evaluation | Offline metrics + A/B testing | Precision@K, NDCG, retention, CTR |
| Caching | Redis layer for recommendation sets | Faster first-paint, TTL sync with expiresAt |
| Observability | Structured logs + metrics | pino + Prometheus exporter |

## Directory Documentation
| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages & API routes |
| `app/api/recommendations/` | Recommendation fetch & interaction logging |
| `lib/` | Core logic (db client, recommendation engine) |
| `prisma/` | Data schema & migrations |
| `scripts/` | Seeding and future batch jobs |
| `types/` | Global TypeScript type augmentations |
| `public/` | Static assets |

## Data Models (Essentials)
- User (email, preferences, sessions)
- Content (category, tags, scores, metadata)
- UserInteraction (implicit/explicit signals)
- Feedback (like/dislike/rating/comment)
- Recommendation (materialized personalized list)

## Expiration & Refresh Strategy
- Each recommendation entry has `expiresAt` (default 7 days).
- Client can force refresh via `GET /api/recommendations?refresh=1`.
- Future: background regeneration after key interaction volume threshold.

## Android App Considerations
- Reuse same REST endpoints.
- Pagination / infinite scroll using `page` + `limit`.
- Add versioned API prefix `/api/v1/` in future for compatibility.

## Security & Safety Cross-Refs
- See `SECURITY.md` for: threat model, moderation roadmap, incident response.
- Ensure any new algorithmic module documents data sources & bias mitigation.

## Performance Principles
- Minimize blocking I/O in API route (engine relies on pre-computed signals where possible).
- Move heavy models (embeddings, ALS) to scheduled batch jobs.
- Employ caching (Redis) for stable recommendation sets within TTL.

## Open Questions / TODO
- Choose embedding model & storage (pgvector vs external) [P0].
- Define content ingestion pipeline (source connectors) [P1].
- Add moderation classification pipeline [P1].
- Implement offline evaluation harness [P1].
- Introduce rate limiting middleware [P0].

## Contribution Guidance
- For any algorithmic change: update section "Recommendation Engine (Current MVP)" + add benchmark deltas.
- For any schema change: add migration rationale in `prisma/` and update diagrams.

---
Maintain this document as architecture evolves.
