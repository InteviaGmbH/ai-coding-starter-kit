import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface DashboardActivityListItem {
  id: string
  description: string
  subtitle?: string
  createdDate: string
}

interface Props {
  title?: string
  items: DashboardActivityListItem[]
}

export function DashboardActivityList({ title = "Letzte Aktivität", items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Aktivität.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p>{item.description}</p>
                  {item.subtitle && <p className="text-muted-foreground">{item.subtitle}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdDate).toLocaleDateString("de-CH")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
