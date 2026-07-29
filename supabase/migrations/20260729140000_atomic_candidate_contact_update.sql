-- QA fix (BUG-9): updateCandidateContact previously ran two separate
-- UPDATE statements (candidates, then profiles.full_name) from the
-- server action. If the first succeeded but the second failed, the
-- function returned {success: false} while candidates.first_name/
-- last_name had already changed — a silent data drift between the two
-- tables (the portal header would then show a different name than the
-- profile itself).
--
-- Fix: wrap both updates in a single Postgres function. A PL/pgSQL
-- function body executes as one statement from the caller's
-- perspective — if either UPDATE fails (RLS denial, the
-- enforce_candidate_self_update_columns trigger, a raised exception for
-- 0 rows matched, etc.), the whole call aborts and neither UPDATE takes
-- effect. No SECURITY DEFINER here on purpose: this must keep running
-- under the caller's own privileges, so existing RLS/trigger protection
-- on both tables still applies exactly as before — this function only
-- adds atomicity, not elevated access.

create function public.update_own_candidate_contact(
  p_first_name text,
  p_last_name text,
  p_phone text
) returns void
  language plpgsql as $$
begin
  update candidates
  set first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone
  where id = public.current_candidate_id();

  if not found then
    raise exception 'Kandidaten-Zeile nicht gefunden oder keine Berechtigung';
  end if;

  update profiles
  set full_name = p_first_name || ' ' || p_last_name
  where id = auth.uid();

  if not found then
    raise exception 'Profil nicht gefunden oder keine Berechtigung';
  end if;
end;
$$;
