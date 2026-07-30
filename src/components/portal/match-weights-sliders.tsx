"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { normalizeWeights, type MatchWeights } from "@/lib/matching/score"

const FACTOR_LABELS: Record<keyof MatchWeights, string> = {
  skills: "Fähigkeiten",
  region: "Region",
  availability: "Verfügbarkeit",
  workload: "Pensum",
}

interface Props {
  weights: MatchWeights
  onChange: (weights: MatchWeights) => void
}

export function MatchWeightsSliders({ weights, onChange }: Props) {
  const normalized = normalizeWeights(weights)

  function handleSliderChange(factor: keyof MatchWeights, value: number) {
    onChange({ ...weights, [factor]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gewichtung anpassen</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(FACTOR_LABELS) as (keyof MatchWeights)[]).map((factor) => (
          <div key={factor} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{FACTOR_LABELS[factor]}</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(normalized[factor])}%
              </span>
            </div>
            <Slider
              value={[weights[factor]]}
              onValueChange={([value]) => handleSliderChange(factor, value)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
