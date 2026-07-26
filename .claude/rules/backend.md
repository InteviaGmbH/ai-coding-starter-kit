---
paths:
  - "src/app/api/**"
  - "src/app/**/actions.ts"
  - "src/app/**/page.tsx"
  - "src/lib/supabase*"
  - "supabase/**"
---

# Backend Development Rules

## Database (Supabase)
- ALWAYS enable Row Level Security on every table
- Create RLS policies for SELECT, INSERT, UPDATE, DELETE
- Add indexes on columns used in WHERE, ORDER BY, and JOIN clauses
- Use foreign keys with ON DELETE CASCADE where appropriate
- Never skip RLS - security first

## API Routes
- Validate all inputs using Zod schemas before processing
- Always check authentication: verify user session exists
- Return meaningful error messages with appropriate HTTP status codes
- Use `.limit()` on all list queries

## Query Patterns
- Use Supabase joins instead of N+1 query loops
- Use `unstable_cache` from Next.js for rarely-changing data
- Always handle errors from Supabase responses
- **Always destructure `{ data, error }` together, never just `{ data }`.** Explicitly check/log `error` before falling back to a default value (`?? "Unbekannt"`, `?? []`, `?? null`, etc.). A silent `{ data }`-only destructure lets a real database error masquerade as "no data" — the fallback renders as if everything worked, and nobody ever finds out. (Root cause of PROJ-8 BUG-3 and PROJ-12 BUG-1 — see `docs/rls-error-handling-audit-2026-07-26.md`.)
- **Never implicitly embed `profiles(...)` via PostgREST when the source table has more than one foreign key into `profiles`** (e.g. both `created_by_id` and a role-specific reference like `actor_id`, `recipient_id`, `proposed_by_id`). PostgREST can't resolve which relationship to use and returns an ambiguous `PGRST201` error — which, per the point above, silently renders as an empty result if `error` isn't checked. Instead: use an explicit relationship hint (`profiles!table_column_fkey(...)`) or a separate `.in('id', [...])` lookup query, as already established in PROJ-7/12. Tables currently affected by this: `activity_log`, `notifications`, `candidate_proposals`.

## Security
- Never hardcode secrets in source code
- Use environment variables for all credentials
- Validate and sanitize all user input
- Use parameterized queries (Supabase handles this)
