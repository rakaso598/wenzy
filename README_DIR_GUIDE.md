# Wenzy Directory Guide

This guide provides contextual README snippets for subdirectories to help any contributor or agent quickly understand purpose and conventions.

## Root Level
- `README.md` Project intro & quickstart.
- `ARCHITECTURE.md` System & engine design.
- `SECURITY.md` Security & safety policies.
- `README_DIR_GUIDE.md` This file.

## app/
Contains Next.js (App Router) pages & API routes.
- `page.tsx` Landing / marketing or entry screen.
- `feed/page.tsx` User feed (will call `/api/recommendations`).
- `api/recommendations/route.ts` GET (fetch recommendations, optional refresh) & POST (interaction logging).

Conventions:
- Avoid heavy logic in route handlers; call into `lib/` services.
- Add future versioning using `/api/v1/` when breaking changes.

## lib/
Core reusable logic.
- `db.ts` Prisma client singleton.
- `recommendation.ts` Hybrid recommendation engine with safety filtering.

Add here:
- Future: `embedding.ts` (vector generation abstraction)
- Future: `moderation.ts` (content safety classification)

## prisma/
Database schema & migrations.
- `schema.prisma` Defines entities: User, Content, Interaction, Feedback, Recommendation, Preferences, Session.

Conventions:
- Each migration must include a short rationale in a sibling `MIGRATION_LOG.md` (to be created when first new migration is added).

## scripts/
Automation & batch utilities.
- `seed-db-postgres.ts` Populate with sample data.
- Future: `generate-embeddings.ts`, `recompute-als.ts`.

## types/
Global or shared type augmentations. Keep minimal; prefer local types near usage.

## public/
Static assets (SVG, icons). Optimize for size; prefer vector.

## Content Safety Roadmap Quick Reference
1. Rule-based keyword filter (current)
2. Moderation classifier + `content.isSafe` flag
3. Per-user sensitive preference controls

## Recommendation Engine Layers
1. Candidate Generation (content-based, collaborative, exploration)
2. Safety Filter
3. Scoring & Ranking
4. (Planned) Diversification & Post-Rank Adjustments
5. (Planned) Caching & Delivery

## Development Standards
- Use TypeScript strict mode (consider enabling `strict` later in `tsconfig`).
- Keep functions pure where possible; side-effects isolated to API routes / scripts.
- Document non-trivial algorithms inline with JSDoc.

## Testing (Planned)
- Unit: scoring helpers & safety filter
- Integration: recommendation generation cycle
- E2E: feed page renders personalized list after interactions

---
Update this guide when adding or restructuring directories.
