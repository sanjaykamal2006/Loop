# Security Policy

## Supported versions

Only the latest commit on `main` (and the currently deployed production build)
receives security fixes. There are no maintained release branches.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting:

https://github.com/sanjaykamal2006/Loop/security/advisories/new

Include:

- affected route, component, or migration
- reproduction steps or a proof of concept
- impact (data exposed, privilege gained, users affected)
- any suggested fix

You can expect an acknowledgement within 72 hours and a status update within
7 days. Please allow time for a fix and deployment before public disclosure.

## Scope

In scope:

- authentication, authorization, and RLS bypasses
- exposure of profiles, phone numbers, messages, or emergency contacts
- account-deletion and service-role endpoints
- XSS, CSRF, open redirects, and CSP weaknesses
- leaked secrets in the repository or build output
- abuse of public endpoints (rate-limit bypass, resource exhaustion)

Out of scope:

- missing security headers on non-production preview URLs
- automated scanner output without a working reproduction
- social engineering and physical attacks
- denial of service from extreme traffic volumes

## Secrets

The repository is public. Never commit `.env` files, service-role keys,
database URLs, or signing secrets. The Supabase anon/publishable key is public
by design; the service-role key must only exist in Vercel environment
variables and GitHub Actions secrets.
