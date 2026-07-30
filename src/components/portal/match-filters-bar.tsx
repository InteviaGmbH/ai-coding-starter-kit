"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface MatchFiltersBarProps {
  skills: string
  region: string
  onSkillsChange: (value: string) => void
  onRegionChange: (value: string) => void
}

export function MatchFiltersBar({
  skills,
  region,
  onSkillsChange,
  onRegionChange,
}: MatchFiltersBarProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="skills-filter">Fähigkeiten</Label>
          <Input
            id="skills-filter"
            value={skills}
            onChange={(e) => onSkillsChange(e.target.value)}
            placeholder="Mit Komma trennen — leer lassen, um alle Kandidaten gleich zu werten"
          />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="region-filter">Region</Label>
          <Input
            id="region-filter"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            placeholder="z.B. Zürich — leer lassen, um alle Kandidaten gleich zu werten"
          />
        </div>
      </CardContent>
    </Card>
  )
}
