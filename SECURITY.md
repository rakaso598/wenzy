# Wenzy Security & Safety Guidelines

## Objectives
- Protect user data (PII: email) and interaction logs.
- Ensure recommended content is safe (non-violent, non-explicit, non-abusive).
- Maintain integrity, availability, confidentiality.

## Data Classification
| Data Type | Examples | Sensitivity | Notes |
|-----------|----------|-------------|-------|
| PII | user.email, session.ipAddress | High | Hash/IP truncate for analytics. |
| Interaction | clicks, likes | Medium | Pseudonymize when exporting. |
| Content Metadata | category, tags | Low | Filter for safety before exposure. |

## Access Control
- Principle of Least Privilege: API routes expose only needed fields.
- Admin / moderation endpoints (future) must require auth (JWT or session token) and role checks.

## Secrets & Environment
- Store secrets only in `.env*` (never commit).
- Required: `DATABASE_URL`, future: `OPENAI_API_KEY`, `REDIS_URL`.
- Rotate secrets if exposed.

## Dependency & Supply Chain
- Use `npm audit --production` in CI.
- Pin major versions (already done). Consider lockfile integrity checks.

## Content Safety Filtering
Current simple rule-based filter (in `lib/recommendation.ts`):
- Block categories / tags containing violence, gore, weapon, terror, abuse, nsfw, explicit
Planned Enhancements:
- ML moderation (OpenAI Moderation / custom classifier). Cache moderation verdict in DB.
- Add `content.isSafe` boolean column after moderation pipeline.

## Logging & Monitoring
- Log only necessary metadata. Avoid full request bodies containing PII.
- Future: integrate request ID + structured logging (pino/winston) and metrics (Prometheus).

## Data Retention & Privacy
- Provide endpoint to delete user (cascade removes interactions & recommendations via Prisma relations).
- Anonymize aggregated analytics after 90 days.

## Incident Response
1. Detect anomaly (error spike, unauthorized access).
2. Revoke exposed secrets.
3. Enable maintenance mode if needed.
4. Audit DB access logs.
5. Postmortem document within 24h.

## Secure Coding Checklist
- Validate all query params and body fields.
- Avoid raw SQL; rely on Prisma parameterization.
- Sanitize any future HTML (DOMPurify server-side) before rendering user-generated content.

## Roadmap
- [ ] Add moderation pipeline & `isSafe` flag.
- [ ] Add rate limiting (per IP/user) on recommendation & interaction endpoints.
- [ ] Implement audit logging table.
- [ ] Introduce feature-flag system for staged rollout.
- [ ] Encryption at rest (Postgres TDE or disk-level) for PII.

## Android App Considerations
- Use token-based auth (short-lived JWT + refresh) with secure storage (EncryptedSharedPreferences / Keystore).
- Pin TLS cert (certificate pinning) in mobile client.
- Use paginated, cached recommendation API calls (HTTP caching headers + ETag).

## Threat Model (High-Level)
| Threat | Mitigation |
|--------|------------|
| SQL Injection | Prisma ORM prepared statements |
| Sensitive Content Leakage | Safety filter + moderation pipeline |
| Brute force / abuse | Rate limiting + IP throttling (planned) |
| Data Exfiltration | Role-based access + minimal fields |
| Supply chain attack | Audit + lockfile integrity |
| PII Exposure in Logs | Structured logging, redaction |

---
Maintain & update this file whenever security-relevant changes are introduced.
