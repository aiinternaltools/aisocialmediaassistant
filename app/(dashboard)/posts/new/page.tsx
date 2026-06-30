import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { createClient } from "@/services/supabase/server"

export const metadata: Metadata = {
  title: "New Post",
}

export const dynamic = "force-dynamic"

export default async function NewPostPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ data: settings }, { data: brandProfile }] = await Promise.all([
    supabase
      .from("settings")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title: "Untitled post",
      content: "",
      media_type: "none",
      status: "draft",
      scheduled_at: null,
      timezone: settings?.timezone ?? "UTC",
      brand_profile_id: brandProfile?.id ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create draft post.")
  }

  redirect(`/posts/${data.id}/edit`)
}
