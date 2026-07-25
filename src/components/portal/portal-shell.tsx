"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LogoutButton } from "@/components/auth/logout-button"

export interface PortalNavItem {
  label: string
  href: string
}

interface PortalShellProps {
  portalTitle: string
  navItems: PortalNavItem[]
  userLabel: string
  children: React.ReactNode
}

function NavLinks({ navItems, pathname }: { navItems: PortalNavItem[]; pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function PortalShell({ portalTitle, navItems, userLabel, children }: PortalShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col md:gap-6 md:p-4">
        <div>
          <p className="text-lg font-semibold text-sidebar-primary-foreground">Dafinex</p>
          <p className="text-xs text-sidebar-foreground/70">{portalTitle}</p>
        </div>
        <NavLinks navItems={navItems} pathname={pathname} />
      </aside>

      <div className="flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Navigation öffnen">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-sidebar text-sidebar-foreground [&>button]:text-sidebar-foreground"
              >
                <div className="mb-6 mt-2">
                  <p className="text-lg font-semibold">Dafinex</p>
                  <p className="text-xs text-sidebar-foreground/70">{portalTitle}</p>
                </div>
                <NavLinks navItems={navItems} pathname={pathname} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium">{portalTitle}</span>
          </div>
          <span className="hidden text-sm font-medium md:inline" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{userLabel}</span>
            <LogoutButton variant="ghost" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
