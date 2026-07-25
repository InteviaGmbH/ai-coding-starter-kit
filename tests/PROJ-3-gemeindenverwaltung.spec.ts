import { test, expect } from "@playwright/test"

test.describe("PROJ-3: Gemeindenverwaltung", () => {
  test("unauthenticated visitor is redirected away from the municipalities list", async ({
    page,
  }) => {
    await page.goto("/internal/municipalities")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from a municipality detail page", async ({
    page,
  }) => {
    await page.goto("/internal/municipalities/22222222-2222-4222-a222-222222222222")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: Logged-in CRUD flows (create/edit/delete a municipality,
  // delete-blocked-by-linked-contact) require an active dafinex_admin/
  // internal_coordinator test account. None exists without the manual
  // bootstrap step documented in supabase/README.md, so those flows are
  // covered by the actions.test.ts Vitest suite (mocked Supabase client)
  // and by manual code review instead — see QA Test Results in the spec.
})
