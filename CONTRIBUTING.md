# Contributing to LOOP

Thanks for helping improve LOOP. Keep changes focused, tested, and small.

## Setup

```bash
cd Loop-App-2-codebase
npm ci
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

Node.js 20+ and npm 10+ are required.

## Before opening a pull request

Run the same gates CI runs:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Database changes also need:

```bash
npm run test:db   # requires TEST_DATABASE_URL
```

## Rules

- Never commit `.env`, service-role keys, database passwords, or signing keys.
- Add a migration for every schema, policy, grant, or RPC change. Do not edit
  migrations that have already been applied in production.
- Keep RLS enabled on every public table. New tables need explicit policies or
  no client grants at all.
- Pin `search_path` on every `SECURITY DEFINER` function.
- New public mutation routes need a rate limit and a fail-closed secret check.
- Preserve keyboard access: dialogs use `useModalA11y`, inputs need labels.
- Prefer server-side logging via `logger` over empty catch blocks.
- Update `README.md` test counts only after a full run.

## Commit style

Use conventional prefixes (`fix:`, `feat:`, `chore:`, `docs:`, `test:`,
`security:`) and explain the user-visible impact in the body.
