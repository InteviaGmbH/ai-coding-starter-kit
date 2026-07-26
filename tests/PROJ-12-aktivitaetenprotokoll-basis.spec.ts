import { test, expect } from "@playwright/test"

test.describe("PROJ-12: Aktivitätenprotokoll (Basis)", () => {
  test("unauthenticated visitor is redirected away from the activity log", async ({ page }) => {
    await page.goto("/internal/activity")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The populated list itself (actor names, German descriptions, last
  // 50 ordering, empty state) requires an active dafinex_admin/
  // internal_coordinator test account plus seeded activity_log data. None of
  // that exists without the manual bootstrap step (see supabase/README.md)
  // and real pilot data, so those flows are covered by Vitest (the
  // describeActivity mapping/fallback logic) + code review — see QA Test
  // Results in the spec (same gap as PROJ-2-11).
})
