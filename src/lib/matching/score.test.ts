import { describe, it, expect } from "vitest"
import { computeMatchScore, normalizeWeights, DEFAULT_MATCH_WEIGHTS } from "./score"

const baseRequest = {
  requiredSkills: ["Pflege", "Betreuung"],
  region: "Zürich",
  startDate: "2026-09-01",
  endDate: "2026-12-31",
  requiredWorkloadPercent: 80,
}

const baseCandidate = {
  skills: ["Pflege", "Betreuung", "Administration"],
  region: "Kanton Zürich",
  availabilityStart: "2026-08-01",
  availabilityEnd: "2026-12-31",
  maxWorkloadPercent: 100,
}

describe("normalizeWeights", () => {
  it("scales weights proportionally to sum to 100", () => {
    const result = normalizeWeights({ skills: 20, region: 20, availability: 20, workload: 20 })
    expect(result.skills + result.region + result.availability + result.workload).toBeCloseTo(100)
    expect(result.skills).toBeCloseTo(25)
  })

  it("returns all zeros when every weight is zero, no division by zero", () => {
    const result = normalizeWeights({ skills: 0, region: 0, availability: 0, workload: 0 })
    expect(result).toEqual({ skills: 0, region: 0, availability: 0, workload: 0 })
  })
})

describe("computeMatchScore", () => {
  it("gives a perfect candidate a 100% overall score", () => {
    const result = computeMatchScore(baseCandidate, baseRequest, DEFAULT_MATCH_WEIGHTS)
    expect(result.skills).toBe(100)
    expect(result.region).toBe(100)
    expect(result.availability).toBe(100)
    expect(result.workload).toBe(100)
    expect(result.overall).toBeCloseTo(100)
  })

  it("still ranks a candidate with zero matches instead of excluding them", () => {
    const result = computeMatchScore(
      { skills: ["Kochen"], region: "Bern", availabilityStart: "2025-01-01", availabilityEnd: "2025-02-01", maxWorkloadPercent: 20 },
      baseRequest,
      DEFAULT_MATCH_WEIGHTS
    )
    expect(result.skills).toBe(0)
    expect(result.region).toBe(0)
    expect(result.availability).toBe(0)
    expect(result.overall).toBeGreaterThanOrEqual(0)
    expect(result.overall).toBeLessThan(30)
  })

  it("scores skills as the percentage of required skills present, case-insensitively", () => {
    const result = computeMatchScore(
      { ...baseCandidate, skills: ["pflege"] },
      baseRequest,
      DEFAULT_MATCH_WEIGHTS
    )
    expect(result.skills).toBe(50) // 1 of 2 required skills
  })

  it("treats an empty required-skills list as full marks", () => {
    const result = computeMatchScore(baseCandidate, { ...baseRequest, requiredSkills: [] })
    expect(result.skills).toBe(100)
  })

  it("matches region as a case-insensitive substring, same rule as PROJ-6", () => {
    const noMatch = computeMatchScore(
      { ...baseCandidate, region: "Bern" },
      baseRequest
    )
    expect(noMatch.region).toBe(0)
  })

  it("treats an empty target region as full marks", () => {
    const result = computeMatchScore(baseCandidate, { ...baseRequest, region: null })
    expect(result.region).toBe(100)
  })

  it("gives full marks for availability when the candidate has no availability set (missing data is neutral)", () => {
    const result = computeMatchScore(
      { ...baseCandidate, availabilityStart: null, availabilityEnd: null },
      baseRequest
    )
    expect(result.availability).toBe(100)
  })

  it("gives full marks for availability when the request has no period set", () => {
    const result = computeMatchScore(baseCandidate, { ...baseRequest, startDate: null, endDate: null })
    expect(result.availability).toBe(100)
  })

  it("scores zero when candidate availability doesn't overlap the request period", () => {
    const result = computeMatchScore(
      { ...baseCandidate, availabilityStart: "2027-01-01", availabilityEnd: "2027-06-01" },
      baseRequest
    )
    expect(result.availability).toBe(0)
  })

  it("gives full marks for workload when the candidate has no workload set (missing data is neutral)", () => {
    const result = computeMatchScore({ ...baseCandidate, maxWorkloadPercent: null }, baseRequest)
    expect(result.workload).toBe(100)
  })

  it("gives full marks for workload when the request has no requirement", () => {
    const result = computeMatchScore(baseCandidate, { ...baseRequest, requiredWorkloadPercent: null })
    expect(result.workload).toBe(100)
  })

  it("gives partial workload credit proportional to how close the candidate is", () => {
    const result = computeMatchScore({ ...baseCandidate, maxWorkloadPercent: 40 }, baseRequest)
    expect(result.workload).toBe(50) // 40 / 80 required
  })

  it("returns an overall score of 0 when all weights are zero, without throwing", () => {
    const result = computeMatchScore(baseCandidate, baseRequest, {
      skills: 0,
      region: 0,
      availability: 0,
      workload: 0,
    })
    expect(result.overall).toBe(0)
  })

  it("weighs a single non-zero factor at 100% of the overall score", () => {
    const result = computeMatchScore(
      { ...baseCandidate, region: "Bern" }, // region mismatch, everything else matches
      baseRequest,
      { skills: 0, region: 100, availability: 0, workload: 0 }
    )
    expect(result.overall).toBe(0) // only region counts, and it's a mismatch
  })
})
