# Mohan Bagh repository instructions

## Workspace commands

Run commands from the repository root (Node.js 20+):

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

The root package uses npm workspaces: `apps/api` is `@mohan-bagh/api`, `apps/web` is `@mohan-bagh/web`, and `packages/shared` is `@mohan-bagh/shared`. Scope commands to a package when working in one area:

```bash
npm run dev --workspace=@mohan-bagh/api
npm run dev --workspace=@mohan-bagh/web
npm run typecheck --workspace=@mohan-bagh/api
npm run build --workspace=@mohan-bagh/web
npm run lint --workspace=@mohan-bagh/web
npm run test --workspace=@mohan-bagh/api -- --runTestsByPath test/utils.spec.ts
```

API Jest specs are in `apps/api/test/**/*.spec.ts`; there are currently no runnable web or shared-package tests. The API's `lint` script is currently a placeholder, while the web lint script runs `next lint`.

Prisma commands are owned by the API workspace:

```bash
npm run prisma:generate --workspace=@mohan-bagh/api
npm run prisma:migrate --workspace=@mohan-bagh/api
npm run prisma:deploy --workspace=@mohan-bagh/api
npm run prisma:seed --workspace=@mohan-bagh/api
```

Copy `.env.example` to `.env` and configure the database, Redis, session secret, and 32-byte base64 encryption key. The checked-in Prisma schema declares a MySQL datasource; treat `apps/api/prisma/schema.prisma` as the database contract when setup documentation disagrees.

## Architecture

- This is an npm-workspaces monorepo for a real-estate broker hierarchy. `packages/shared` exports role/permission constants, API response types, and Zod validation schemas consumed by both applications.
- `apps/api` is a NestJS API on port 3001 under the global `/api/v1` prefix, with Swagger at `/api/docs`. `AppModule` composes infrastructure modules for Prisma and Redis, the encryption module, and domain modules for auth, users, admin, employees, master brokers, brokers, and public endpoints.
- The API persists users, roles/permissions, profiles, referrals, sessions, identity-document hashes, and security/login data through Prisma. Profile PII is AES-256-GCM encrypted by `EncryptionService`; PAN/Aadhaar and reset/referral tokens are stored as SHA-256 hashes for duplicate lookup or validation. User deletion is soft (`deletedAt`) and account/session invalidation uses `status` plus `sessionVersion`.
- Authentication is an HTTP-only `sessionId` cookie. Login stores session data in Redis (`sess:<id>`); `AuthGuard` validates the Redis session, user status/deletion state, and session version before attaching `req.user`. Protected controllers combine `AuthGuard`, `PermissionsGuard`, and `@RequirePermissions(...)` using constants from `@mohan-bagh/shared`.
- `apps/web` is a Next.js 14 App Router frontend on port 3000 using Tailwind. Its `/api/v1/auth/login` and `/api/v1/auth/me` route handlers proxy to the Nest API and forward cookies. Browser middleware only redirects missing-cookie requests; authorization remains enforced by the API guards.

## Repository conventions

- API responses normally use `{ status, message, data? }`. `TransformInterceptor` supplies that envelope for controller results that do not already include both `status` and `message`; return a complete envelope directly when the message matters.
- Validation failures are normalized by the global `ValidationFilter` into `{ status: false, message, errors }`, where `errors` maps field names to messages. Use Nest DTO validation for request bodies so the global `ValidationPipe` can whitelist and transform input.
- Controllers are deliberately thin: put business operations, transactions, hierarchy ownership checks, PII encryption, and token/document hashing in services. Guard resource routes with the required permission constant instead of hand-rolling role checks.
- Keep sensitive profile values encrypted through `EncryptionService`; use `sha256` for values that need equality/uniqueness checks without disclosure. Do not replace these with plaintext persistence.
- Prisma changes require `prisma:generate` before type-checking or building. The current TypeScript services use camel-cased Prisma delegates and fields (for example, `prisma.user` and `createdAt`), while the checked-in schema contains snake_case model and field names. Reconcile that contract deliberately before regenerating the client or changing persistence code.
- TypeScript source is authoritative. Some API and shared source directories also contain generated `.js` and `.d.ts` artifacts, and the API has `dist`/`dist2` build output; do not make feature changes only in generated files.
