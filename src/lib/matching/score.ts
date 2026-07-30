export interface MatchWeights {
  skills: number
  region: number
  availability: number
  workload: number
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skills: 40,
  region: 25,
  availability: 25,
  workload: 10,
}

export interface MatchCandidateInput {
  skills: string[]
  region: string | null
  availabilityStart: string | null
  availabilityEnd: string | null
  maxWorkloadPercent: number | null
}

export interface MatchRequestCriteria {
  requiredSkills: string[]
  region: string | null
  startDate: string | null
  endDate: string | null
  requiredWorkloadPercent: number | null
}

export interface MatchScoreBreakdown {
  skills: number
  region: number
  availability: number
  workload: number
  overall: number
}

/** Scales weights proportionally so they sum to 100, without changing their
 * relative ratio. All-zero weights stay all-zero (overall score becomes 0). */
export function normalizeWeights(weights: MatchWeights): MatchWeights {
  const total = weights.skills + weights.region + weights.availability + weights.workload
  if (total <= 0) {
    return { skills: 0, region: 0, availability: 0, workload: 0 }
  }
  return {
    skills: (weights.skills / total) * 100,
    region: (weights.region / total) * 100,
    availability: (weights.availability / total) * 100,
    workload: (weights.workload / total) * 100,
  }
}

function scoreSkills(candidateSkills: string[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 100
  const normalizedCandidate = new Set(candidateSkills.map((s) => s.trim().toLowerCase()))
  const matched = requiredSkills.filter((s) => normalizedCandidate.has(s.trim().toLowerCase()))
  return (matched.length / requiredSkills.length) * 100
}

// Same case-insensitive substring rule PROJ-6 already established
// (candidate.region ILIKE %target%), so results stay consistent with the
// filter behavior this feature replaces.
function scoreRegion(candidateRegion: string | null, targetRegion: string | null): number {
  const target = targetRegion?.trim()
  if (!target) return 100
  if (!candidateRegion) return 0
  return candidateRegion.toLowerCase().includes(target.toLowerCase()) ? 100 : 0
}

function datesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null
): boolean {
  // A missing end date is treated as open-ended (no upper bound).
  const aEndOk = !aEnd || aEnd >= bStart
  const bEndOk = !bEnd || bEnd >= aStart
  return aEndOk && bEndOk
}

function scoreAvailability(
  candidateStart: string | null,
  candidateEnd: string | null,
  requestStart: string | null,
  requestEnd: string | null
): number {
  if (!requestStart) return 100 // request has no period to compare against
  if (!candidateStart) return 100 // missing candidate data — neutral per spec decision
  return datesOverlap(candidateStart, candidateEnd, requestStart, requestEnd) ? 100 : 0
}

function scoreWorkload(candidatePercent: number | null, requiredPercent: number | null): number {
  if (requiredPercent == null) return 100 // request has no requirement
  if (candidatePercent == null) return 100 // missing candidate data — neutral per spec decision
  if (candidatePercent >= requiredPercent) return 100
  return Math.max(0, (candidatePercent / requiredPercent) * 100)
}

export function computeMatchScore(
  candidate: MatchCandidateInput,
  request: MatchRequestCriteria,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchScoreBreakdown {
  const normalized = normalizeWeights(weights)

  const skills = scoreSkills(candidate.skills, request.requiredSkills)
  const region = scoreRegion(candidate.region, request.region)
  const availability = scoreAvailability(
    candidate.availabilityStart,
    candidate.availabilityEnd,
    request.startDate,
    request.endDate
  )
  const workload = scoreWorkload(candidate.maxWorkloadPercent, request.requiredWorkloadPercent)

  const overall =
    (skills * normalized.skills +
      region * normalized.region +
      availability * normalized.availability +
      workload * normalized.workload) /
    100

  return { skills, region, availability, workload, overall }
}
