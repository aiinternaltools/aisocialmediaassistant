import { cache } from "react"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { isAdminEmail } from "@/lib/auth/admin"
import { getSessionUser } from "@/lib/auth/session"

export const requireAuth = cache(async (): Promise<User> => {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  return user
})

export const requireAdmin = cache(async (): Promise<User> => {
  const user = await requireAuth()

  if (!isAdminEmail(user.email)) {
    redirect("/login?error=unauthorized")
  }

  return user
})
