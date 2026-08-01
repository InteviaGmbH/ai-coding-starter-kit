import { describe, it, expect } from "vitest"
import { isWidgetVisible } from "./widget-keys"

describe("isWidgetVisible", () => {
  it("is visible when not in the hidden list", () => {
    expect(isWidgetVisible([], "stats")).toBe(true)
    expect(isWidgetVisible(["activity"], "stats")).toBe(true)
  })

  it("is hidden when present in the hidden list", () => {
    expect(isWidgetVisible(["stats"], "stats")).toBe(false)
  })
})
