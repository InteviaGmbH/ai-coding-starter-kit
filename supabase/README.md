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
- `migrations/20260726110000_assignments_internal_only_update.sql` (PROJ-9 — assignment status progression is internal-only; replaces the PROJ-1 `assignments_update` policy that had no `with check` at all)
- `migrations/20260726120000_contracts_internal_only.sql` (PROJ-10 — both contract document uploads are internal-only; replaces the PROJ-1 `contracts_update`/`contracts_documents_insert` policies that let the municipality/candidate write with no `with check` at all)
- `migrations/20260726130000_notifications_new_request_broadcast.sql` (PROJ-11 — lets a municipality broadcast a "new request" notification to every active internal user)
- `migrations/20260726140000_candidates_select_municipality_proposed.sql` (PROJ-8 regression fix, found via a full E2E dry run — municipalities had no read access at all to `candidates`, so the proposals page silently showed "Unbekannt"/"—" instead of the candidate's name/skills/region/availability)
- `migrations/20260729090000_candidate_self_service_fields.sql` (PROJ-20 — adds `phone`/`availability_start`/`availability_end`/`max_workload_percent`/`preferred_regions`/`certifications`/`languages`/`experience_years` to `candidates`; adds a column-lockdown trigger so a candidate's self-update can only touch their own contact/availability/qualification fields, never `source_type`/`region`/`availability`/audit columns; adds read access so a candidate can see the municipality/request behind their own assignments — this file already includes the recursion fix below, nothing else to run for a brand-new database)
- `migrations/20260729100000_fix_candidate_assigned_policies_recursion.sql` (PROJ-20 bug fix, found live via `/candidate/dashboard` — **run this if you already applied `20260729090000` before this fix landed.** The two new policies added there used raw inline subqueries against `candidate_proposals`/`personnel_requests` instead of a `SECURITY DEFINER` helper function like every other cross-table RLS lookup in this schema; since both tables have RLS and `candidate_proposals_select` itself reads `personnel_requests`, this created a policy-evaluation cycle — Postgres error 42P17, "infinite recursion detected in policy". Safe to re-run.)
- `migrations/20260729110000_candidate_documents_bucket_size_limit.sql` (PROJ-20 bug fix, found live — the `candidate-documents` bucket was created without an explicit `file_size_limit`/`allowed_mime_types`, so uploads were only bounded by the project-wide Storage default instead of the 10 MB/PDF-JPEG-PNG limit the UI actually communicates. Pins the bucket to match the client exactly. Safe to re-run.)
- `migrations/20260729120000_fix_candidate_documents_own_folder_check.sql` (PROJ-20 bug fix, found live — a candidate uploading their own CV via `/candidate/profile` got a 403 "new row violates row-level security policy" from `storage.objects`. `candidate_documents_select`/`candidate_documents_insert`'s non-internal branch was written in PROJ-1 as `(storage.foldername(name))[1] = current_candidate_id()::text`, but was never actually exercised until PROJ-20 — every real access before that went through the `is_internal_role()` branch. Replaces it with a plain `name like (current_candidate_id()::text || '/%')` prefix match, removing any dependency on `storage.foldername()`'s exact array-slicing behavior. Safe to re-run.)
- `migrations/20260729130000_add_missing_storage_update_policies.sql` (PROJ-20 bug fix, found live — the 403 persisted after the previous fix specifically when *replacing* an existing document. Neither `candidate-documents` nor `contracts` ever had a `for update` policy on `storage.objects`, for any role — Supabase's `upload(..., { upsert: true })` performs an UPDATE (not INSERT) when an object already exists at that path, which Supabase's own docs say requires the `update` RLS permission. Adds `candidate_documents_update` (own-folder-or-internal, same condition as insert) and `contracts_documents_update` (internal-only, matching `contracts_documents_insert`). Pre-existing PROJ-1 gap, not introduced by PROJ-20 — just never exercised before since no prior real usage replaced an already-uploaded file at the same path. Safe to re-run.)
- `migrations/20260729140000_atomic_candidate_contact_update.sql` (PROJ-20 QA fix, BUG-9 — `updateCandidateContact` wrote `candidates` and `profiles.full_name` as two separate UPDATEs; a failure on the second left the two tables out of sync. Adds `update_own_candidate_contact()`, a plain (non-`SECURITY DEFINER`) Postgres function that does both updates in one call so either both succeed or neither does — RLS/trigger protection on both tables still applies exactly as before, this only adds atomicity.)

## Future migrations
Add new files to `migrations/` named `<timestamp>_<description>.sql` and run them the same way. Once the Supabase CLI is set up locally, `supabase db push` can apply them directly instead of the SQL Editor.
