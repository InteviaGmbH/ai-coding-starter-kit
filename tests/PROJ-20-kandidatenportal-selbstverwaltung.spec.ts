import { test, expect } from "@playwright/test"

test.describe("PROJ-20: Kandidatenportal – Selbstverwaltung für Kandidaten", () => {
  test("unauthenticated visitor is redirected away from the candidate profile page", async ({
    page,
  }) => {
    await page.goto("/candidate/profile")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from the candidate assignments list", async ({
    page,
  }) => {
    await page.goto("/candidate/assignments")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("unauthenticated visitor is redirected away from a candidate assignment detail page", async ({
    page,
  }) => {
    await page.goto("/candidate/assignments/88888888-8888-4888-a888-888888888888")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The profile edit (contact/availability/qualifications/document),
  // "eigene Einsätze" list/detail, and PROJ-4 read-only display flows all
  // require an active candidate test account plus seeded assignments/
  // proposals data that doesn't exist without the manual bootstrap step
  // (see supabase/README.md) and real pilot data — same gap already
  // documented in PROJ-2/3/4/5/6/7/8/9's specs. Those flows are covered by
  // Vitest (mocked Supabase, 13 tests in src/app/candidate/profile/
  // actions.test.ts) + manual code review — see QA Test Results below.
})
