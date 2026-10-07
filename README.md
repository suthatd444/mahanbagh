# Mohan Bagh

Production-ready real-estate broker hierarchy platform.

## Setup

1. Copy `.env.example` to `.env`
2. Setup PostgreSQL and Redis
3. Run migrations: `npm run prisma:migrate --workspace=@mohan-bagh/api`
4. Seed: `npm run prisma:seed --workspace=@mohan-bagh/api`
5. Dev: `npm run dev`

## Tech
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: Next.js App Router + Tailwind
- Auth: HTTP-only cookie sessions + Redis
- Encryption: AES-256-GCM
- Hashing: Argon2id
# mahanbagh
