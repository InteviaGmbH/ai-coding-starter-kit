import { test, expect } from "@playwright/test"

test.describe("PROJ-4: Kandidatenverwaltung", () => {
  test("unauthenticated visitor is redirected away from the candidates list", async ({ page }) => {
    await page.goto("/internal/candidates")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from a candidate detail page", async ({
    page,
  }) => {
    await page.goto("/internal/candidates/33333333-3333-4333-a333-333333333333")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: Logged-in CRUD flows (create/edit/delete/search/document upload)
  // require an active dafinex_admin/internal_coordinator test account. None
  // exists without the manual bootstrap step documented in
  // supabase/README.md, so those flows are covered by the actions.test.ts
  // Vitest suite (mocked Supabase client) and manual code review instead —
  // see QA Test Results in the spec (same gap as PROJ-2/PROJ-3).
})
