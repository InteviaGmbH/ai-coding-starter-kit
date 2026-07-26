import { test, expect } from "@playwright/test"

test.describe("PROJ-8: Gemeinde-Interview & Annahme", () => {
  test("unauthenticated visitor is redirected away from the municipality proposals list", async ({
    page,
  }) => {
    await page.goto("/municipality/requests/44444444-4444-4444-a444-444444444444/proposals")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The accept/decline workflow itself requires an active municipality
  // test account plus seeded personnel_requests/candidate_proposals data.
  // None of that exists without the manual bootstrap step (see
  // supabase/README.md) and real pilot data, so those flows are covered by
  // Vitest (mocked Supabase) + code review — see QA Test Results in the spec
  // (same gap as PROJ-2/3/4/5/6/7). This QA pass also found two RLS bugs
  // (BUG-1, BUG-2) that a live account would have caught immediately.
})
