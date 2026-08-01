import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface QuickAction {
  label: string
  href: string
  badgeCount?: number
}

export function DashboardQuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schnellzugriffe</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.href} asChild variant="outline">
            <Link href={action.href}>
              {action.label}
              {typeof action.badgeCount === "number" && ` (${action.badgeCount})`}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
