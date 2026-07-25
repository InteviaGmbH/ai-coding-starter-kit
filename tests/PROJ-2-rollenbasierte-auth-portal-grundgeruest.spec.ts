import { test, expect } from "@playwright/test"

const TEST_PASSWORD = "Test1234!"

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`
}

test.describe("PROJ-2: Rollenbasierte Auth & Portal-Grundgerüst", () => {
  test("unauthenticated visitor is redirected to /login when opening a protected portal", async ({
    page,
  }) => {
    await page.goto("/internal/dashboard")
    await expect(page).toHaveURL(/\/login$/)
  })

  test("candidate can register and lands on the pending screen after logging in", async ({
    page,
  }) => {
    const email = uniqueEmail("candidate")

    await page.goto("/register")
    await page.getByRole("tab", { name: "Kandidat" }).click()

    await page.getByLabel("Vorname").fill("Test")
    await page.getByLabel("Nachname").fill("Kandidat")
    await page.getByLabel("E-Mail").fill(email)
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel("Passwort bestätigen").fill(TEST_PASSWORD)
    await page.getByLabel("Fähigkeiten").fill("Pflege, Betreuung")
    await page.getByLabel("Region").fill("Kanton Zürich")
    await page.getByLabel("Verfügbarkeit").fill("ab sofort")

    await page.getByRole("button", { name: "Als Kandidat registrieren" }).click()

    await expect(
      page.getByText("Dein Konto wird von Dafinex geprüft und freigeschaltet.")
    ).toBeVisible({ timeout: 15000 })

    // signUp() already established a session (Confirm Email is off), so we're
    // technically logged in right now even though we're still showing the
    // inline success message on /register. Navigating anywhere in the (auth)
    // group should bounce an already-authenticated pending user to /pending
    // rather than showing them the login form again.
    await page.goto("/login")
    await expect(page).toHaveURL(/\/pending$/, { timeout: 15000 })
    await expect(page.getByText("Konto wird geprüft")).toBeVisible()

    // Now log out and log back in fresh — must land on /pending again, not
    // on the candidate portal (covers the account_status-based redirect
    // guard for a genuine, separate login rather than a lingering session).
    await page.getByRole("button", { name: "Abmelden" }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 })
    // LogoutButton does a hard `window.location.href` redirect (full page
    // reload, per the project's Supabase auth convention), which is slower
    // to hydrate than client-side navigation — wait for it to settle so the
    // form's submit handler is actually attached before we click it.
    await page.waitForLoadState("networkidle")

    await page.getByLabel("E-Mail").fill(email)
    await page.getByLabel("Passwort").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Anmelden" }).click()

    await expect(page).toHaveURL(/\/pending$/, { timeout: 15000 })
    await expect(page.getByText("Konto wird geprüft")).toBeVisible()
  })

  test("municipality contact can register and sees the pending confirmation", async ({ page }) => {
    const email = uniqueEmail("municipality")

    await page.goto("/register")
    await page.getByRole("tab", { name: "Gemeinde" }).click()

    await page.getByLabel("Name").fill("Test Ansprechperson")
    await page.getByLabel("Telefonnummer").fill("+41 44 123 45 67")
    await page.getByLabel("E-Mail").fill(email)
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel("Passwort bestätigen").fill(TEST_PASSWORD)

    await page.getByRole("button", { name: "Als Gemeinde registrieren" }).click()

    await expect(
      page.getByText("Dein Konto wird von Dafinex geprüft und freigeschaltet.")
    ).toBeVisible({ timeout: 15000 })
  })

  test("login with a wrong password shows a generic error and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login")
    await page.getByLabel("E-Mail").fill(uniqueEmail("nonexistent"))
    await page.getByLabel("Passwort").fill("wrong-password")
    await page.getByRole("button", { name: "Anmelden" }).click()

    await expect(page.getByText("E-Mail oder Passwort ist falsch.")).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("registering the same email twice is rejected", async ({ page }) => {
    const email = uniqueEmail("duplicate")

    async function register() {
      await page.goto("/register")
      await page.getByRole("tab", { name: "Gemeinde" }).click()
      await page.getByLabel("Name").fill("Duplicate Test")
      await page.getByLabel("Telefonnummer").fill("+41 44 000 00 00")
      await page.getByLabel("E-Mail").fill(email)
      await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD)
      await page.getByLabel("Passwort bestätigen").fill(TEST_PASSWORD)
      await page.getByRole("button", { name: "Als Gemeinde registrieren" }).click()
    }

    await register()
    await expect(
      page.getByText("Dein Konto wird von Dafinex geprüft und freigeschaltet.")
    ).toBeVisible({ timeout: 15000 })

    // signUp() already logged us in as the (pending) account from the first
    // registration — log out first, otherwise the (auth) group's guard would
    // just bounce the second /register visit to /pending before the form
    // ever loads, regardless of the duplicate-email check.
    await page.goto("/")
    await expect(page).toHaveURL(/\/pending$/, { timeout: 15000 })
    await page.getByRole("button", { name: "Abmelden" }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 })

    await register()
    await expect(page.getByText("Diese E-Mail-Adresse ist bereits registriert.")).toBeVisible({
      timeout: 15000,
    })
  })
})
