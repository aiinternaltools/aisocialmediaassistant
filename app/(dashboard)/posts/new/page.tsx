import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { getBrandProfile } from "@/features/brand/actions"
import { getPlatforms } from "@/features/posts/actions"
import { PostEditor } from "@/features/posts/components/post-editor"
import { createClient } from "@/services/supabase/server"

export const metadata: Metadata = {
  title: "New Post",
}

export default async function NewPostPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [platformsResult, brandResult] = await Promise.all([
    getPlatforms(),
    getBrandProfile(),
  ])

  const platforms = platformsResult.success ? platformsResult.data : []
  const brandProfile = brandResult.success ? brandResult.data : null

  const { data: settings } = await supabase
    .from("settings")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Post"
        description="Compose a new social media post."
      />
      <PostEditor
        mode="create"
        platforms={platforms}
        defaultTimezone={settings?.timezone ?? "UTC"}
        brandProfileComplete={brandProfile?.is_complete ?? false}
        initialValues={{
          brand_profile_id: brandProfile?.id ?? null,
        }}
      />
    </div>
  )
}
