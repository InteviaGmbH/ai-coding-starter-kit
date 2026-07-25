import { test, expect } from "@playwright/test"

test.describe("PROJ-5: Personalanfrage-Workflow", () => {
  test("unauthenticated visitor is redirected away from municipality requests", async ({
    page,
  }) => {
    await page.goto("/municipality/requests")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from a municipality request detail page", async ({
    page,
  }) => {
    await page.goto("/municipality/requests/44444444-4444-4444-a444-444444444444")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from internal requests", async ({ page }) => {
    await page.goto("/internal/requests")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from an internal request detail page", async ({
    page,
  }) => {
    await page.goto("/internal/requests/44444444-4444-4444-a444-444444444444")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: Logged-in create/edit/withdraw/mark-reviewed flows require active
  // municipality and dafinex_admin test accounts. Neither exists without the
  // manual bootstrap step / an approved municipality registration (see
  // supabase/README.md), so those flows are covered by the actions.test.ts
  // Vitest suites (mocked Supabase client) and manual code review instead —
  // see QA Test Results in the spec (same gap as PROJ-2/3/4).
})
