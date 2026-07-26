import { test, expect } from "@playwright/test"

test.describe("PROJ-9: Einsatzverwaltung mit Statusverlauf", () => {
  test("unauthenticated visitor is redirected away from the internal assignments list", async ({
    page,
  }) => {
    await page.goto("/internal/assignments")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from an assignment detail page", async ({
    page,
  }) => {
    await page.goto("/internal/assignments/88888888-8888-4888-a888-888888888888")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from the municipality assignments list", async ({
    page,
  }) => {
    await page.goto("/municipality/assignments")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The create/advance workflow itself requires an active
  // dafinex_admin/internal_coordinator test account plus seeded
  // candidate_proposals data. None of that exists without the manual
  // bootstrap step (see supabase/README.md) and real pilot data, so those
  // flows are covered by Vitest (mocked Supabase) + code review — see QA
  // Test Results in the spec (same gap as PROJ-2/3/4/5/6/7/8).
})
