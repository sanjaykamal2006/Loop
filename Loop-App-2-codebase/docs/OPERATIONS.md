# LOOP Operations Runbook

This document covers production operations for `https://loop-app.runs-on.dev` and the Supabase project backing it.

## 1. Environments

| Environment | URL / Target | Notes |
| :--- | :--- | :--- |
| Production | `https://loop-app.runs-on.dev` | Vercel, canonical repository |
| Legacy mirror | `https://loop-demo-app.vercel.app` | HTTP 308 redirect to production |
| Database | Supabase PostgreSQL 17 | Project ref `molpzciemegendacaglt` |
| Repository | `sanjaykamal2006/Loop` | App lives in `Loop-App-2-codebase/` |

## 2. Required Production Variables

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase REST/Realtime endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public RLS-enforced key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for account deletion, admin routes, and the shared rate limiter |
| `CLEANUP_CRON_SECRET` | Bearer secret for `/api/cleanup` |
| `ADMIN_STATS_SECRET` | Bearer secret for `/api/admin/stats` (falls back to `CLEANUP_CRON_SECRET`) |
| `ASSETLINKS_SHA256` | Optional Android TWA signing fingerprints |
| `NEXT_PUBLIC_PACKAGE_NAME` | Optional TWA package name |

Do not add Upstash variables. Rate limiting is backed by the `rate_limits` table and `check_rate_limit()` RPC, with an in-memory fallback when the database is unavailable.

## 3. Deploying

1. Make changes in `Loop-App-2-codebase/`.
2. Run the local gates:
   ```bash
   npm run lint
   npm run typecheck
   npm run test:run
   npm run test:coverage
   npm run build
   npm run test:e2e
   ```
3. Sync to the canonical repository:
   ```bash
   node scripts/sync-repo.js
   ```
4. Review and commit the change in `Loop-Repo/`, then push to `main`.
5. Wait for the Vercel production deployment to reach `Ready`.
6. Run the live checks in section 8.

## 4. Database Migrations

Migrations live in `supabase/migrations/` and are applied in filename order.

To apply a migration to production:

1. Open the Supabase SQL editor for project `molpzciemegendacaglt`.
2. Paste the migration file and run it as the database owner.
3. Confirm the expected objects exist:
   ```sql
   select relname, relrowsecurity
   from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r'
   order by relname;
   ```
4. Re-run the read-only contract tests with a non-production database:
   ```bash
   $env:TEST_DATABASE_URL="postgresql://..."; npm run test:db
   ```

Do not run the contract suite against the production database; it is read-only but still unnecessary.

### Shared Rate Limiter

Migration: `supabase/migrations/20261022_shared_rate_limits.sql`

Expected production shape:

- `public.rate_limits` exists with primary key `key` and index `rate_limits_reset_at_idx`.
- RLS is enabled and there are **zero** policies. This is intentional: all client roles are denied.
- `anon` and `authenticated` have no table privileges.
- `public.check_rate_limit(text, integer, integer)` is `SECURITY DEFINER`, has `search_path = public`, and is executable only by `service_role`.
- Expired rows are deleted opportunistically by the RPC (at most 25 rows per call, ~5% of calls).

Verify permissions after applying:

```sql
select
  has_table_privilege('anon', 'public.rate_limits', 'SELECT') as anon_can_read,
  has_function_privilege('anon', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('service_role', 'public.check_rate_limit(text, integer, integer)', 'EXECUTE') as service_can_execute;
```

Expected: `false, false, true`.

## 5. Routine Maintenance

### Keep-alive

`.github/workflows/keep-alive.yml` runs every two days and pings the Supabase REST endpoint to prevent inactivity pausing. It reads the publishable key from repository secrets or variables; set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (secret or variable) if the workflow reports a missing key.

### Uptime

`.github/workflows/uptime.yml` runs every 15 minutes and requires HTTP 2xx plus `"status":"healthy"` from `/api/keep-alive`. Investigate a red run before the next deployment.

### Database bloat

Run `VACUUM (ANALYZE)` during a low-traffic window, for example from the SQL editor:

```sql
vacuum (analyze) public.loops;
vacuum (analyze) public.messages;
vacuum (analyze) public.profiles;
vacuum (analyze) public.rate_limits;
```

Supabase performs autovacuum automatically; manual runs are only for reclaiming space or refreshing planner statistics after large deletes.

### Dependency updates

Dependabot opens pull requests for npm and GitHub Actions updates. Security updates should be merged after the normal gate suite passes.

## 6. Observability

- **Client errors:** `POST /api/telemetry` writes structured JSON to server logs. Payloads are size-capped and deduplicated client-side to avoid floods.
- **Server logs:** Vercel function logs contain the same structured entries.
- **Browser diagnostics:** `window.__LOOP_DIAGNOSTICS__()` returns the local 20-entry ring buffer. `sessionStorage["loop_last_crash"]` stores the most recent unhandled error.
- **Security scanning:** CodeQL runs on pushes and pull requests. Dependabot covers npm and Actions.

## 7. Security Headers

CSP is generated per request in `src/proxy.ts` with a nonce and a JSON-LD SHA-256 hash. Do not add a static `Content-Security-Policy` to `next.config.ts`; two policies are intersected by the browser and the static one would block nonce-bearing scripts.

Static headers in `next.config.ts`: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, and CORP.

## 8. Post-deploy Verification

```bash
# Headers and CSP
curl -sSI https://loop-app.runs-on.dev/ | findstr /I "content-security-policy strict-transport cross-origin"

# Health
curl -sS https://loop-app.runs-on.dev/api/keep-alive

# Canonical + structured data + screenshot noindex
curl -sS https://loop-app.runs-on.dev/ | findstr /I "canonical application/ld+json noindex"

# Rate-limit response
curl -sS -X POST https://loop-app.runs-on.dev/api/telemetry -H "Content-Type: application/json" -d "{\"message\":\"deploy-check\"}"
```

Also verify that HTML script tags carry a nonce matching the response header, and that the page renders without CSP violations in the browser console.

## 9. Rollback

1. In Vercel, promote the last known-good deployment.
2. Revert the corresponding commit in `Loop-Repo/` if the bad change is already merged.
3. Do not roll back a database migration destructively. Add a forward migration instead.
4. Re-run the uptime workflow and the checks in section 8.

## 10. Access and Secrets

- Rotate `SUPABASE_SERVICE_ROLE_KEY`, `CLEANUP_CRON_SECRET`, and `ADMIN_STATS_SECRET` immediately if exposed.
- Update Vercel environment variables and redeploy after rotation.
- The Supabase publishable/anon key is public by design; RLS still applies to it.
- Never commit `.env` files or service-role keys. `scripts/sync-repo.js` excludes local env files.
