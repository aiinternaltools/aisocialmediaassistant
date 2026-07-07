import { AppError } from "@/lib/errors/app-error"
import {
  bucketForMediaType,
  copyInBucket,
} from "@/services/storage/upload"
import { createClient } from "@/services/supabase/server"

export async function duplicatePostMedia(
  userId: string,
  sourcePostId: string,
  targetPostId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: media, error } = await supabase
    .from("post_media")
    .select("*")
    .eq("post_id", sourcePostId)
    .maybeSingle()

  if (error) {
    throw new AppError({
      code: "INTERNAL",
      message: error.message,
      userMessage: "Failed to load post media.",
    })
  }

  if (!media) {
    return
  }

  const bucket = bucketForMediaType(media.media_type)
  const metadata = media.metadata as { file_name?: string } | null
  const fileName =
    metadata?.file_name ??
    media.storage_path.split("/").pop() ??
    "media-copy"

  const copied = await copyInBucket(
    userId,
    bucket,
    media.storage_path,
    fileName,
  )

  const { error: insertError } = await supabase.from("post_media").insert({
    post_id: targetPostId,
    media_type: media.media_type,
    storage_path: copied.storagePath,
    mime_type: media.mime_type,
    file_size: media.file_size,
    width: media.width,
    height: media.height,
    metadata: media.metadata,
  })

  if (insertError) {
    throw new AppError({
      code: "INTERNAL",
      message: insertError.message,
      userMessage: "Failed to copy post media.",
    })
  }
}
