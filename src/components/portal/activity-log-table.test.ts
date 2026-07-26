import { describe, it, expect } from "vitest"
import { describeActivity } from "./activity-log-table"

describe("describeActivity", () => {
  it.each([
    ["personnel_request", "reviewed", "Anfrage geprüft"],
    ["candidate_proposal", "proposed", "Kandidat vorgeschlagen"],
    ["candidate_proposal", "approved", "Vorschlag freigegeben"],
    ["candidate_proposal", "rejected", "Vorschlag abgelehnt"],
    ["candidate_proposal", "municipality_accepted", "Vorschlag von Gemeinde angenommen"],
    ["candidate_proposal", "municipality_declined", "Vorschlag von Gemeinde abgelehnt"],
    ["assignment", "created", "Einsatz angelegt"],
    ["assignment", "accepted", "Einsatz akzeptiert"],
    ["assignment", "active", "Einsatz aktiv gesetzt"],
    ["assignment", "completed", "Einsatz abgeschlossen"],
    ["contract", "generated", "Vertrag generiert"],
    ["contract", "signed", "Vertrag unterschrieben"],
  ])("maps %s/%s to %s", (entityType, action, expected) => {
    expect(describeActivity(entityType, action)).toBe(expected)
  })

  it("falls back to a raw 'entityType: action' string for an unmapped combination", () => {
    expect(describeActivity("future_entity", "did_something")).toBe("future_entity: did_something")
  })

  it("falls back for a known entity type with an unmapped action", () => {
    expect(describeActivity("assignment", "cancelled")).toBe("assignment: cancelled")
  })
})
