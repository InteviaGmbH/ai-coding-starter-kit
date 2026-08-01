"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { updateHiddenDashboardWidgets } from "@/app/dashboard-preferences/actions"
import { DASHBOARD_WIDGET_LABELS, type DashboardWidgetKey } from "@/lib/dashboard/widget-keys"

interface Props {
  availableWidgets: DashboardWidgetKey[]
  hidden: string[]
}

export function DashboardWidgetToggle({ availableWidgets, hidden }: Props) {
  const router = useRouter()
  const [localHidden, setLocalHidden] = useState<string[]>(hidden)
  const [pending, setPending] = useState(false)

  async function handleToggle(widget: DashboardWidgetKey, visible: boolean) {
    const next = visible
      ? localHidden.filter((w) => w !== widget)
      : [...localHidden, widget]

    setLocalHidden(next)
    setPending(true)
    await updateHiddenDashboardWidgets(next)
    setPending(false)
    router.refresh()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Widgets anpassen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <p className="text-sm font-medium">Sichtbare Bereiche</p>
          {availableWidgets.map((widget) => {
            const visible = !localHidden.includes(widget)
            return (
              <div key={widget} className="flex items-center gap-2">
                <Checkbox
                  id={`widget-${widget}`}
                  checked={visible}
                  disabled={pending}
                  onCheckedChange={(checked) => handleToggle(widget, checked === true)}
                />
                <Label htmlFor={`widget-${widget}`} className="text-sm font-normal">
                  {DASHBOARD_WIDGET_LABELS[widget]}
                </Label>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
