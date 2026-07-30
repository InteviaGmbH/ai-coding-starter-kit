"use client"

import { useMemo, useState } from "react"
import { MatchWeightsSliders } from "@/components/portal/match-weights-sliders"
import { MatchFiltersBar } from "@/components/portal/match-filters-bar"
import {
  MatchingCandidatesTable,
  type MatchingCandidateRow,
} from "@/components/portal/matching-candidates-table"
import {
  computeMatchScore,
  DEFAULT_MATCH_WEIGHTS,
  type MatchWeights,
} from "@/lib/matching/score"

export interface MatchingCandidateSource {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
  availabilityStart: string | null
  availabilityEnd: string | null
  maxWorkloadPercent: number | null
  alreadyProposed: boolean
}

interface Props {
  requestId: string
  requestReviewed: boolean
  initialSkills: string[]
  initialRegion: string
  requestStartDate: string | null
  requestEndDate: string | null
  requestRequiredWorkloadPercent: number | null
  candidates: MatchingCandidateSource[]
}

function toTagArray(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function CandidateMatchingPanel({
  requestId,
  requestReviewed,
  initialSkills,
  initialRegion,
  requestStartDate,
  requestEndDate,
  requestRequiredWorkloadPercent,
  candidates,
}: Props) {
  const [skills, setSkills] = useState(initialSkills.join(", "))
  const [region, setRegion] = useState(initialRegion)
  const [weights, setWeights] = useState<MatchWeights>(DEFAULT_MATCH_WEIGHTS)

  const rows: MatchingCandidateRow[] = useMemo(() => {
    const requiredSkills = toTagArray(skills)
    const targetRegion = region.trim()

    return candidates
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        skills: c.skills,
        region: c.region,
        availability: c.availability,
        alreadyProposed: c.alreadyProposed,
        score: computeMatchScore(
          {
            skills: c.skills,
            region: c.region,
            availabilityStart: c.availabilityStart,
            availabilityEnd: c.availabilityEnd,
            maxWorkloadPercent: c.maxWorkloadPercent,
          },
          {
            requiredSkills,
            region: targetRegion || null,
            startDate: requestStartDate,
            endDate: requestEndDate,
            requiredWorkloadPercent: requestRequiredWorkloadPercent,
          },
          weights
        ),
      }))
      .sort((a, b) => {
        if (b.score.overall !== a.score.overall) return b.score.overall - a.score.overall
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      })
  }, [candidates, skills, region, weights, requestStartDate, requestEndDate, requestRequiredWorkloadPercent])

  return (
    <div className="space-y-6">
      <MatchWeightsSliders weights={weights} onChange={setWeights} />
      <MatchFiltersBar
        skills={skills}
        region={region}
        onSkillsChange={setSkills}
        onRegionChange={setRegion}
      />
      <MatchingCandidatesTable
        candidates={rows}
        requestId={requestId}
        requestReviewed={requestReviewed}
      />
    </div>
  )
}
