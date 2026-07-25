# Supabase Setup — Dafinex

## One-time setup
1. Create a Supabase project at [supabase.com](https://supabase.com) in the **Frankfurt (EU)** region (required for DSG/nDSG compliance — see PROJ-1 spec).
2. In the Supabase dashboard, open **SQL Editor** and run `migrations/20260725120000_init_schema.sql`.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key (server-only, never expose to the browser)

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

## Future migrations
Add new files to `migrations/` named `<timestamp>_<description>.sql` and run them the same way. Once the Supabase CLI is set up locally, `supabase db push` can apply them directly instead of the SQL Editor.
