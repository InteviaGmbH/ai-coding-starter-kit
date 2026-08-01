"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { StatusDistributionPoint } from "@/lib/dashboard/load-assignment-status-distribution"

const chartConfig: ChartConfig = {
  count: {
    label: "Einsätze",
    color: "hsl(var(--primary))",
  },
}

interface Props {
  title?: string
  data: StatusDistributionPoint[]
}

export function StatusDistributionChart({ title = "Einsätze nach Status", data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Einsätze vorhanden.</p>
        ) : (
          <ChartContainer config={chartConfig} className="max-h-64 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
