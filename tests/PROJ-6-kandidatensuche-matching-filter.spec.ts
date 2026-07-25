import { test, expect } from "@playwright/test"

test.describe("PROJ-6: Kandidatensuche mit Matching-Filter", () => {
  test("unauthenticated visitor is redirected away from the matching search page", async ({
    page,
  }) => {
    await page.goto("/internal/requests/44444444-4444-4444-a444-444444444444/candidates")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The filtered search itself (skills OR-match, region substring
  // match, excluding pending-account candidates, the "Kandidat vorschlagen"
  // placeholder) requires an active dafinex_admin/internal_coordinator test
  // account plus seeded personnel_requests/candidates data. None of that
  // exists without the manual bootstrap step (see supabase/README.md) and
  // real pilot data, so those flows are covered by code review only — see
  // QA Test Results in the spec (same gap as PROJ-2/3/4/5).
})
