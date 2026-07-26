import { test, expect } from "@playwright/test"

test.describe("PROJ-10: Einfache Vertragsgenerierung", () => {
  test("unauthenticated visitor is redirected away from the municipality assignment detail page", async ({
    page,
  }) => {
    await page.goto("/municipality/assignments/88888888-8888-4888-a888-888888888888")
    await expect(page).toHaveURL(/\/login$/)
  })

  // NOTE: The upload/sign workflow itself requires an active
  // dafinex_admin/internal_coordinator test account plus a seeded assignment.
  // None of that exists without the manual bootstrap step (see
  // supabase/README.md) and real pilot data, so those flows are covered by
  // Vitest (mocked Supabase) + a deliberately RLS-focused code review — see
  // QA Test Results in the spec (same gap as PROJ-2-9).
})
