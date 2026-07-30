import { describe, it, expect } from "vitest"
import { getExpiryStatus } from "./expiry"

const REFERENCE = new Date("2026-07-30T12:00:00")

describe("getExpiryStatus", () => {
  it("returns 'none' when no expiry date is set", () => {
    expect(getExpiryStatus(null, REFERENCE)).toBe("none")
  })

  it("returns 'expired' when the expiry date is in the past", () => {
    expect(getExpiryStatus("2026-07-01", REFERENCE)).toBe("expired")
  })

  it("returns 'expired' for yesterday", () => {
    expect(getExpiryStatus("2026-07-29", REFERENCE)).toBe("expired")
  })

  it("returns 'expiring_soon' within the 30-day warning window", () => {
    expect(getExpiryStatus("2026-08-15", REFERENCE)).toBe("expiring_soon")
  })

  it("returns 'expiring_soon' for exactly 30 days out", () => {
    expect(getExpiryStatus("2026-08-29", REFERENCE)).toBe("expiring_soon")
  })

  it("returns 'ok' for a date more than 30 days out", () => {
    expect(getExpiryStatus("2027-01-01", REFERENCE)).toBe("ok")
  })

  it("returns 'expiring_soon' for today (0 days out, not yet expired)", () => {
    expect(getExpiryStatus("2026-07-30", REFERENCE)).toBe("expiring_soon")
  })
})
