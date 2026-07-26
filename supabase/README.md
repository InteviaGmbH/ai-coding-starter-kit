# Supabase Setup — Dafinex

## One-time setup (brand-new Supabase project)
1. Create a Supabase project at [supabase.com](https://supabase.com) in the **Frankfurt (EU)** region (required for DSG/nDSG compliance — see PROJ-1 spec).
2. In the Supabase dashboard, open **SQL Editor** and run `migrations/20260725120000_init_schema.sql` — it already includes the BUG-1–4 fixes below, nothing else to run.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key (server-only, never expose to the browser)
4. Under **Authentication → Sign In / Providers → Email**, turn **"Confirm email" OFF**. Self-registration (PROJ-2) is already gated by our own `account_status = 'pending'` approval step, and the candidate registration flow creates the `candidates` row and uploads the CV *immediately after* `signUp()` using the new session — that only works if a session is returned right away instead of after an email-confirmation round-trip.

## Schema overview
- **Enums:** `user_role`, `account_status`, `candidate_source_type`, `request_status`, `proposal_status`, `assignment_status`, `contract_status`
- **Tables:** `profiles`, `municipalities`, `candidates`, `personnel_requests`, `candidate_proposals`, `assignments`, `contracts`, `notifications`, `activity_log`
- **Storage buckets (private):** `candidate-documents` (files under `<candidate_id>/...`), `contracts` (files under `<assignment_id>/...`)
- Every table has the standard fields `id`, `created_date`, `updated_date`, `created_by_id`, `created_by`, `is_sample`.
- New Supabase Auth sign-ups automatically get a `profiles` row with `account_status = 'pending'` via the `handle_new_user` trigger. Pass the intended role on sign-up: `supabase.auth.signUp({ email, password, options: { data: { role: 'municipality' | 'candidate' } } })`. **Self-registration only ever creates `municipality` or `candidate` accounts** — the trigger rejects any other role to prevent privilege escalation.
- Candidates additionally get to create exactly one `candidates` row for themselves at registration (`profile_id = auth.uid()`); it's auto-linked back to their profile via the `link_candidate_profile` trigger.
- Row Level Security is enabled on every table — see the migration file for the exact policies per role.

## Bootstrapping the first admin account
Since self-registration can never create `dafinex_admin`/`super_admin`/`internal_coordinator` accounts (by design — see above), the very first admin must be promoted manually, once, via the SQL Editor:
```sql
update profiles set role = 'super_admin', account_status = 'active' where email = 'you@example.com';
```
After that, this first admin can invite/promote further internal staff through the normal app (any `dafinex_admin` can update another profile's `role`/`account_status`).

## If you already ran the migration once
`migrations/20260725120000_init_schema.sql` is **not idempotent** (plain `create table`/`create type`/`create policy`, no `if not exists` guards) — re-running the whole file against a database that already has these objects will fail with "already exists" errors.

If you already successfully ran it before the 2026-07-25 QA fix round (BUG-1–4: role-escalation on signup, self-assignment to any municipality/candidate, missing `account_status` check, candidates unable to self-register), run only the incremental patch instead: `migrations/20260725130000_fix_rls_bugs_1_4.sql`. It's safe to re-run — every `DROP` uses `IF EXISTS` and every function uses `CREATE OR REPLACE`.

If your database already has the BUG-1–4 fixes but predates the features below, run their incremental patches in order (all safe to re-run):
- `migrations/20260725140000_municipality_request_policies.sql` (PROJ-5 — lets a municipality edit/withdraw its own unreviewed requests)
- `migrations/20260726090000_municipality_proposal_decision.sql` (PROJ-8 — lets a municipality accept/decline an internally-approved candidate proposal, and hides proposals still under internal review or internally rejected)
- `migrations/20260726100000_proposal_decision_fixes.sql` (PROJ-8 QA fixes — locks every candidate_proposals column but `status` against non-internal actors, and lets a municipality's accept/decline write the activity_log entry + notification the feature depends on)

## Future migrations
Add new files to `migrations/` named `<timestamp>_<description>.sql` and run them the same way. Once the Supabase CLI is set up locally, `supabase db push` can apply them directly instead of the SQL Editor.
