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

Every applied migration must be recorded in the production ledger
`supabase_migrations.schema_migrations` (see section 6a). To apply a new
migration to production:

1. Run the targeted ledger runner with the new file only (never replay history):
   `node migrate-with-ledger.cjs <env-file> <migration-filename-fragment>`
   or paste the file in the Supabase SQL editor and then
   `insert into supabase_migrations.schema_migrations(version, name, statements, statements_executed, statements_errors) values ('<yyyymmddhhmmss>', '<file>', 1, 1, 0);`
2. Confirm the expected objects exist:
   ```sql
   select relname, relrowsecurity
   from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r'
   order by relname;
   ```
3. Re-run the read-only contract tests with a non-production database:
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
- **Client error aggregation:** global `error` / `unhandledrejection` listeners in `clientTelemetry.installGlobalErrorHandlers()` forward every failure React boundaries cannot see (async listeners, timers, promises) to the same capped, deduplicated telemetry channel. First-party only — no third-party or paid monitoring service.
- **Server logs:** Vercel function logs contain the same structured entries.
- **Browser diagnostics:** `window.__LOOP_DIAGNOSTICS__()` returns the local 20-entry ring buffer. `sessionStorage["loop_last_crash"]` stores the most recent unhandled error.
- **Security scanning:** CodeQL runs on pushes and pull requests. Dependabot covers npm and Actions.

## 6a. Migration Ledger

Every schema change is tracked in the production ledger table `supabase_migrations.schema_migrations` (28 rows as of 2026-10-20). To inspect or extend it:

```bash
# What is recorded?
psql "$DATABASE_URL" -c "select version, name, statements_executed from supabase_migrations.schema_migrations order by version;"
```

- `statements_executed = 0` marks historical migrations applied before the ledger existed (verified by the schema-contract suite, not replayed).
- Apply new migrations to production with a targeted runner (never replay history): pass only the new file(s), e.g. `node migrate-with-ledger.cjs <env-file> 20261024_new_change`.
- CI and local verification run the full history against an empty PostgreSQL 17 database with `scripts/run-migrations.js`, so a fresh environment and production converge to the same final schema.

## 6b. Backup & Restore Drill (monthly, free tier)

1. **Dump.** From any machine with `psql`/`pg_dump` 17:
   `pg_dump "$DATABASE_URL" --schema=public --format=custom --file=loop-prod-YYYYMMDD.dump`
   (plus `--schema=supabase_migrations` for the ledger).
2. **Verify.** `pg_restore --list loop-prod-YYYYMMDD.dump | findstr /C:"TABLE DATA" ` — the 11 public tables plus the ledger must appear.
3. **Restore drill.** Spin up a scratch database (a local `postgres:17` container or the `embedded-postgres` npm package), restore with
   `pg_restore --clean --if-exists -d "$SCRATCH_URL" loop-prod-YYYYMMDD.dump`, then run
   `TEST_DATABASE_URL="$SCRATCH_URL" npm run test:db` — all 28 contract tests must pass against the restored data.
4. **Log the drill** (date, dump size, restore result) in this file or the team channel. If a step fails, treat it as a P2 incident.
5. Supabase's own automatic daily backups remain the first line of defense; this drill validates that a restore actually works.

## 6c. Incident Escalation ("red run")

- The **Uptime** GitHub Action (`/.github/workflows/uptime.yml`) checks `GET /api/keep-alive` every 15 minutes. A failure (non-2xx or missing `"status":"healthy"`) emails the repository owner automatically — do not silence notifications for this repo.
- **Paging:** if Vercel is down, check status.vercel.com; if Supabase is down, check status.supabase.com. Respond to a failed health check within 30 minutes during waking hours.
- **Degraded DB:** `/api/keep-alive` reports `status:"degraded"` when the DB RPC times out but the app is up. If two consecutive checks (30 min) report degraded, investigate the Supabase dashboard before restarting anything.
- **Rate-limit false positives:** the health endpoint allows 30 requests / 5 min per IP. If the uptime check hits 429, extend the window in `src/app/api/keep-alive/route.ts` rather than disabling rate limiting.

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
