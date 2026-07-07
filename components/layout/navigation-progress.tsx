"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#") || anchor.target === "_blank") {
    return false
  }

  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).origin === window.location.origin
    } catch {
      return false
    }
  }

  return href.startsWith("/")
}

function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const routeKey = `${pathname}?${searchParams.toString()}`

  const clearTimers = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current)
      completeTimerRef.current = null
    }
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }, [])

  const startProgress = useCallback(() => {
    clearTimers()
    setActive(true)
    setProgress(12)

    tickTimerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 88) {
          return current
        }
        return current + Math.random() * 10
      })
    }, 200)
  }, [clearTimers])

  const completeProgress = useCallback(() => {
    clearTimers()
    setProgress(100)
    completeTimerRef.current = setTimeout(() => {
      setActive(false)
      setProgress(0)
    }, 220)
  }, [clearTimers])

  useEffect(() => {
    completeProgress()
  }, [routeKey, completeProgress])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a")
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      if (!isInternalNavigationLink(anchor)) {
        return
      }

      const href = anchor.getAttribute("href")
      if (!href) {
        return
      }

      const nextUrl = new URL(href, window.location.origin)
      const nextKey = `${nextUrl.pathname}${nextUrl.search}`
      if (nextKey === routeKey) {
        return
      }

      startProgress()
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [routeKey, startProgress])

  useEffect(() => clearTimers, [clearTimers])

  if (!active && progress === 0) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
    >
      <div
        className={cn(
          "h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-[width,opacity] duration-200 ease-out",
          progress >= 100 ? "opacity-0" : "opacity-100",
        )}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  )
}
