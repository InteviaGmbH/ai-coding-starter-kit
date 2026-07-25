"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface MatchFiltersBarProps {
  requestId: string
  initialSkills: string[]
  initialRegion: string
}

export function MatchFiltersBar({ requestId, initialSkills, initialRegion }: MatchFiltersBarProps) {
  const router = useRouter()
  const [skills, setSkills] = useState(initialSkills.join(", "))
  const [region, setRegion] = useState(initialRegion)

  function applyFilters() {
    const params = new URLSearchParams()
    params.set("skills", skills)
    params.set("region", region)
    router.push(`/internal/requests/${requestId}/candidates?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="skills-filter">Fähigkeiten</Label>
          <Input
            id="skills-filter"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Mit Komma trennen — leer lassen, um nicht zu filtern"
          />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="region-filter">Region</Label>
          <Input
            id="region-filter"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="z.B. Zürich — leer lassen, um nicht zu filtern"
          />
        </div>
        <Button onClick={applyFilters}>Filter anwenden</Button>
      </CardContent>
    </Card>
  )
}
