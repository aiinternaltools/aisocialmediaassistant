import { AppError } from "@/lib/errors/app-error"
import { getGeminiClient } from "@/services/ai/gemini-client"
import {
  formatGeminiApiError,
  GEMINI_IMAGE_GENERATION_MODEL,
} from "@/services/ai/gemini-models"
import { buildImagePrompt } from "@/services/ai/prompt-builder"
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageAspectRatio,
} from "@/services/ai/types"
import { createAdminClient } from "@/services/supabase/admin"

const ASPECT_RATIO_DIMENSIONS: Record<
  ImageAspectRatio,
  { width: number; height: number; size: string }
> = {
  square: { width: 1024, height: 1024, size: "1024x1024" },
  portrait: { width: 768, height: 1024, size: "768x1024" },
  landscape: { width: 1024, height: 768, size: "1024x768" },
}

const IMAGE_GENERATION_MODEL = GEMINI_IMAGE_GENERATION_MODEL

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_")
}

function resolveAspectRatio(
  aspectRatio: ImageAspectRatio,
  settingsSize: string,
): { width: number; height: number; size: string } {
  if (aspectRatio) {
    return ASPECT_RATIO_DIMENSIONS[aspectRatio]
  }

  const fromSettings = Object.values(ASPECT_RATIO_DIMENSIONS).find(
    (entry) => entry.size === settingsSize,
  )

  return fromSettings ?? ASPECT_RATIO_DIMENSIONS.square
}

export async function generateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const dimensions = resolveAspectRatio(
    input.aspectRatio,
    input.settings.gemini_image_size,
  )

  const fullPrompt = buildImagePrompt({
    prompt: input.prompt,
    postContent: input.postContent,
    brandProfile: input.brandProfile,
    settingsStyle: input.settings.gemini_image_style,
    defaultImagePrompt: input.settings.default_image_prompt,
  })

  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: IMAGE_GENERATION_MODEL,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  })

  let imageBase64: string | null = null
  let mimeType = "image/png"

  try {
    const result = await model.generateContent(
      `${fullPrompt}\n\nAspect ratio: ${dimensions.size}.`,
    )

    const parts = result.response.candidates?.[0]?.content?.parts ?? []

    for (const part of parts) {
      if ("inlineData" in part && part.inlineData?.data) {
        imageBase64 = part.inlineData.data
        mimeType = part.inlineData.mimeType ?? "image/png"
        break
      }
    }
  } catch (error) {
    throw new AppError({
      code: "EXTERNAL_SERVICE",
      message: error instanceof Error ? error.message : "Gemini request failed",
      userMessage: formatGeminiApiError(error),
      cause: error,
    })
  }

  if (!imageBase64) {
    throw new AppError({
      code: "EXTERNAL_SERVICE",
      message: "Gemini returned no image data",
      userMessage: "AI did not return an image. Please try again with a different prompt.",
    })
  }

  const buffer = Buffer.from(imageBase64, "base64")
  const extension = mimeType.split("/")[1] ?? "png"
  const storagePath = `${input.userId}/${Date.now()}-${sanitizeFileName(`generated.${extension}`)}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from("generated-images")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    throw new AppError({
      code: "INTERNAL",
      message: uploadError.message,
      userMessage: "Failed to store generated image.",
    })
  }

  return {
    storagePath,
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
    fileSize: buffer.byteLength,
  }
}

export { ASPECT_RATIO_DIMENSIONS }
