import { z } from "zod"

export const STRATEGY_CONTENT_TYPES = [
  "image_post",
  "carousel",
  "reel",
  "story",
  "video",
  "text_post",
  "thread",
  "poll",
] as const

export type StrategyContentType = (typeof STRATEGY_CONTENT_TYPES)[number]

export const STRATEGY_CONTENT_TYPE_LABELS: Record<StrategyContentType, string> = {
  image_post: "Image Post",
  carousel: "Carousel",
  reel: "Reel",
  story: "Story",
  video: "Video",
  text_post: "Text Post",
  thread: "Thread",
  poll: "Poll",
}

export const strategyStepSchema = z.object({
  day: z.number().int().min(1).max(30),
  content_type: z.enum(STRATEGY_CONTENT_TYPES),
  topic: z.string().min(1).max(500),
  objective: z.string().min(1).max(500),
  product_reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  completed: z.boolean(),
})

export type StrategyStep = z.infer<typeof strategyStepSchema>

export const strategyResponseSchema = z.object({
  steps: z.array(strategyStepSchema),
})

export const campaignFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  duration_days: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Minimum duration is 1 day")
    .max(30, "Maximum duration is 30 days"),
  campaign_goal: z
    .string()
    .min(1, "Campaign goal is required")
    .max(2000, "Campaign goal is too long"),
  target_audience: z.string().max(1000, "Target audience is too long").optional(),
  seasonality: z.string().max(500, "Seasonality is too long").optional(),
  extra_instructions: z
    .string()
    .max(2000, "Extra instructions are too long")
    .optional(),
  product_ids: z.array(z.string().uuid()),
})

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

export function parseStrategySteps(raw: unknown): StrategyStep[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((item) => {
      const parsed = strategyStepSchema.safeParse(item)
      return parsed.success ? parsed.data : null
    })
    .filter((step): step is StrategyStep => step !== null)
}

export function validateGeneratedStrategy(
  steps: StrategyStep[],
  durationDays: number,
): { valid: true; steps: StrategyStep[] } | { valid: false; error: string } {
  if (steps.length !== durationDays) {
    return {
      valid: false,
      error: `Expected ${durationDays} strategy steps, got ${steps.length}.`,
    }
  }

  const days = steps.map((s) => s.day).sort((a, b) => a - b)
  for (let i = 0; i < durationDays; i++) {
    if (days[i] !== i + 1) {
      return {
        valid: false,
        error: `Strategy steps must be numbered 1 through ${durationDays}.`,
      }
    }
  }

  const normalized = steps
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((step) => ({ ...step, completed: false }))

  return { valid: true, steps: normalized }
}
