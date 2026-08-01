export type DashboardWidgetKey = "stats" | "activity" | "chart" | "quickActions"

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  stats: "Kennzahlen",
  activity: "Letzte Aktivität",
  chart: "Diagramm",
  quickActions: "Schnellzugriffe",
}

export function isWidgetVisible(hidden: string[], widget: DashboardWidgetKey): boolean {
  return !hidden.includes(widget)
}
