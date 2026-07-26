import { test, expect } from "@playwright/test"

test.describe("PROJ-7: Kandidatenvorschlag & interne Freigabe", () => {
  test("unauthenticated visitor is redirected away from the proposals list", async ({ page }) => {
    await page.goto("/internal/requests/44444444-4444-4444-a444-444444444444/proposals")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The propose/approve/reject/withdraw workflow itself requires an
  // active dafinex_admin/internal_coordinator test account plus seeded
  // personnel_requests/candidates data. None of that exists without the
  // manual bootstrap step (see supabase/README.md) and real pilot data, so
  // those flows are covered by Vitest (mocked Supabase) + code review — see
  // QA Test Results in the spec (same gap as PROJ-2/3/4/5/6).
})
