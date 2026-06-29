import type { BrandProfileRow, SettingsBundle } from "@/types/app"

export type AiTextOperation =
  | "generate_caption"
  | "rewrite"
  | "improve_writing"
  | "generate_cta"
  | "generate_hashtags"
  | "translate"
  | "change_tone"
  | "summarize"
  | "expand"
  | "shorten"

export type ImageAspectRatio = "square" | "portrait" | "landscape"

export type BuildPromptInput = {
  brandProfile: BrandProfileRow | null
  postContent: string
  platformIds: string[]
  platformNames: string[]
  userInstruction?: string
  operation: AiTextOperation
  targetLanguage?: string
  tone?: string
  defaultTextPrompt?: string | null
  defaultTextLengthPrompt?: string | null
}

export type TextCompletionContext = {
  brandProfile: BrandProfileRow | null
  postContent: string
  platformIds: string[]
  platformNames: string[]
  settings: SettingsBundle
  userInstruction?: string
  targetLanguage?: string
  tone?: string
}

export type TextCompletionResult = {
  text: string
  tokensUsed: number | null
  promptSummary: string
}

/** @deprecated Use TextCompletionResult */
export type OpenAiCompletionResult = TextCompletionResult

export type GenerateImageInput = {
  prompt: string
  postContent: string
  aspectRatio: ImageAspectRatio
  brandProfile: BrandProfileRow
  settings: SettingsBundle
  userId: string
}

export type GenerateImageResult = {
  storagePath: string
  mimeType: string
  width: number
  height: number
  fileSize: number
}
