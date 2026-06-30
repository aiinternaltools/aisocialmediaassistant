"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BotMessageSquare,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "sidebar-collapsed"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Posts",
    href: "/posts",
    icon: FileText,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Marketing Strategy",
    href: "/marketing-strategy",
    icon: Megaphone,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const

function AppLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center font-semibold tracking-tight transition-opacity hover:opacity-90",
        collapsed ? "justify-center" : "gap-2.5",
      )}
      aria-label="AI Social Assistant home"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-primary to-sky-500 text-white shadow-sm ring-1 ring-white/15">
        <BotMessageSquare className="size-[1.125rem]" strokeWidth={2.25} />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
      </span>
      {!collapsed ? (
        <span className="truncate text-sm leading-tight">
          AI Social
          <span className="block text-xs font-normal text-sidebar-foreground/60">
            Assistant
          </span>
        </span>
      ) : null}
    </Link>
  )
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: (typeof navItems)[number]
  isActive: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  const linkClassName = cn(
    "flex items-center rounded-lg text-sm font-medium transition-colors",
    collapsed ? "size-9 justify-center px-0" : "gap-3 px-3 py-2",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  )

  if (!collapsed) {
    return (
      <Link href={item.href} className={linkClassName}>
        <Icon className="size-4 shrink-0" />
        {item.title}
      </Link>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            className={linkClassName}
            aria-label={item.title}
          />
        }
      >
        <Icon className="size-4 shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.title}
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setCollapsed(stored === "true")
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <TooltipProvider delay={200}>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <AppLogo collapsed={collapsed} />
        </div>

        <nav
          className={cn(
            "flex flex-1 flex-col gap-1 p-2",
            collapsed && "items-center",
          )}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            )
          })}
        </nav>

        <div
          className={cn(
            "border-t border-sidebar-border p-2",
            collapsed ? "flex justify-center" : "",
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size={collapsed ? "icon-sm" : "sm"}
                  className={cn(!collapsed && "w-full justify-start")}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  onClick={toggleCollapsed}
                />
              }
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <>
                  <ChevronLeft className="size-4" />
                  Collapse
                </>
              )}
            </TooltipTrigger>
            {collapsed ? (
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            ) : null}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
