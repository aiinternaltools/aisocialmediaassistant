import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { PostEditorSectionIcon } from "@/features/posts/components/post-editor-sidebar"

const SECTION_ACCENT = {
  default: "from-foreground/60 via-foreground/20 to-transparent",
  violet: "from-violet-500/70 via-violet-400/25 to-transparent",
  primary: "from-primary via-primary/25 to-transparent",
  sky: "from-sky-500/70 via-sky-400/25 to-transparent",
  amber: "from-amber-500/70 via-amber-400/25 to-transparent",
} as const

const SECTION_TIER = {
  primary: {
    title: "text-xl font-semibold tracking-tight sm:text-[1.375rem]",
    description: "text-sm leading-relaxed text-muted-foreground",
    icon: "md" as const,
    showRule: true,
    spacing: "space-y-3",
  },
  secondary: {
    title: "text-base font-semibold tracking-tight",
    description: "text-sm leading-relaxed text-muted-foreground",
    icon: "sm" as const,
    showRule: false,
    spacing: "space-y-2.5",
  },
} as const

export function PostEditorSectionHeader({
  icon,
  iconVariant = "default",
  tier = "primary",
  title,
  description,
  action,
}: {
  icon: LucideIcon
  iconVariant?: keyof typeof SECTION_ACCENT
  tier?: keyof typeof SECTION_TIER
  title: string
  description: string
  action?: ReactNode
}) {
  const styles = SECTION_TIER[tier]
  const TitleTag = tier === "primary" ? "h2" : "h3"

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <PostEditorSectionIcon
          icon={icon}
          variant={iconVariant}
          size={styles.icon}
        />
        <div className={cn("min-w-0 flex-1", styles.spacing)}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <TitleTag
              className={cn(
                "font-heading text-foreground",
                styles.title,
              )}
            >
              {title}
            </TitleTag>
            {styles.showRule ? (
              <div
                aria-hidden
                className={cn(
                  "hidden h-px min-w-[3rem] flex-1 rounded-full bg-gradient-to-r sm:block",
                  SECTION_ACCENT[iconVariant],
                )}
              />
            ) : null}
          </div>
          <p className={cn("max-w-2xl", styles.description)}>{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  )
}

export function PostEditorSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3", className)}>{children}</section>
  )
}

export function PostEditorFieldHint({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function PostEditorGroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "text-xs font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  )
}
