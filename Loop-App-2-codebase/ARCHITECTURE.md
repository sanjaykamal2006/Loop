# LOOP Architecture & System Specification

## 1. Overview
LOOP is a real-time, student-verified ride coordination web application built for VIT-AP University. It allows verified students to discover, join, split fares, and coordinate shared auto-rickshaw/vehicle trips ("loops") between campus and regional transit hubs (Vijayawada, Guntur) with integrated emergency SOS safety features.

---

## 2. Technical Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Lucide React
- **Backend & Realtime**: Supabase (PostgreSQL 15+, Auth PKCE, Realtime Engine, Storage)
- **Rate Limiting**: Upstash Redis (Sliding-window counter) with dev fallback
- **Hosting & Edge**: Vercel
- **Testing**: Vitest 2.1+, React Testing Library, JSDOM

---

## 3. Security & Access Control Model

### 3.1 Three-Tier Student Email Gating
1. **Client-Side Validation**: Strict RFC regex requiring `@vitap.ac.in` or `@vitapstudent.ac.in` domains, rejecting plus-addressing (`+alias`) and sub-domain spoofing.
2. **Edge Route Validation**: `/api/auth/validate-email` validates format, checks dynamic admin whitelist table, and enforces IP/email sliding-window rate limiting.
3. **Database Level (PostgreSQL BEFORE INSERT Trigger)**: `check_auth_user_email_domain()` executes on `auth.users`, ensuring unapproved domains or plus-addressed emails cannot be registered even if API layer is bypassed.

### 3.2 Row Level Security (RLS) & InitPlan Performance
All 10 public schema tables enforce Row Level Security. All policy clauses utilize `(SELECT auth.uid())` and `(SELECT auth.role())` to ensure PostgreSQL executes the auth check once via an **InitPlan** rather than re-evaluating per row.
- `loops`: Selectable if public or creator; female-only loops restricted to female users via `profiles.gender` join.
- `loop_members`: Joins gated by loop status and capacity.
- `messages`: Insert permitted only to verified participants of active loops.
- `profile_contacts`: Dedicated private table separating personal phone numbers from public profiles. Accessible only by co-passengers of active loops via `get_loop_contacts()` RPC.

### 3.3 HTTP Defense-in-Depth Headers
Configured in `next.config.ts`:
- `Content-Security-Policy`: Strict directives restricting script, style, connect (`*.supabase.co`, `wss:`), img, and media (`cdn.freesound.org` for SOS siren).
- `X-Frame-Options`: `DENY`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=(self)`

---

## 4. Concurrency & Data Integrity
- **Capacity Enforcement**: Seat capacity (2 to 10 riders) is guarded by a PostgreSQL `BEFORE INSERT` trigger executing `SELECT ... FOR UPDATE` on `loops`. This locks the target row during membership join, preventing race-condition overfilling without app-level mutexes.
- **Account Deletion Safeguard**: `messages.user_id` utilizes `ON DELETE SET NULL`. When a user deletes their account, their past messages and departure notices remain intact with `user_id: null` so co-riders are not stranded or confused by ghost cancellations.

---

## 5. Offline Capabilities & Emergency SOS
- **Manifest Lease Buffer**: Device caches the active loop manifest, co-rider names, and destination in `localStorage` upon connection.
- **Airplane Mode Safety**: SOS triggers continue to work offline, composing emergency SMS and launching native dialers (`tel:112`) using the cached manifest and GPS coordinates even without network connectivity.
