"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  generateCampaignStrategy,
  setActiveCampaign,
  toggleStrategyStepCompleted,
} from "@/features/marketing-strategy/actions"
import {
  parseStrategySteps,
  STRATEGY_CONTENT_TYPE_LABELS,
  type StrategyStep,
} from "@/lib/validations/marketing-campaign"
import { formatStrategyContentType } from "@/services/ai/strategy-prompt-builder"
import type { MarketingCampaignWithProgress } from "@/types/app"

interface StrategyViewProps {
  campaign: MarketingCampaignWithProgress
}

function StepCard({
  step,
  campaignId,
  onUpdated,
}: {
  step: StrategyStep
  campaignId: string
  onUpdated: () => void
}) {
  const [isToggling, startToggle] = useTransition()

  function handleToggle(checked: boolean) {
    startToggle(async () => {
      const result = await toggleStrategyStepCompleted(
        campaignId,
        step.day,
        checked,
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      onUpdated()
    })
  }

  const contentLabel =
    STRATEGY_CONTENT_TYPE_LABELS[
      step.content_type as keyof typeof STRATEGY_CONTENT_TYPE_LABELS
    ] ?? formatStrategyContentType(step.content_type)

  return (
    <Card className={step.completed ? "opacity-75" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {step.completed ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              Day {step.day}
              <Badge variant="secondary">{contentLabel}</Badge>
            </CardTitle>
            <CardDescription className="text-foreground font-medium">
              {step.topic}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={step.completed}
              disabled={isToggling}
              onCheckedChange={(value) => handleToggle(value === true)}
              aria-label={`Mark day ${step.day} complete`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium text-muted-foreground">Objective: </span>
          {step.objective}
        </p>
        {step.product_reference ? (
          <p>
            <span className="font-medium text-muted-foreground">Product: </span>
            {step.product_reference}
          </p>
        ) : null}
        {step.notes ? (
          <p>
            <span className="font-medium text-muted-foreground">Notes: </span>
            {step.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function StrategyView({ campaign }: StrategyViewProps) {
  const router = useRouter()
  const steps = parseStrategySteps(campaign.strategy)
  const hasStrategy = steps.length > 0
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [isGenerating, startGenerate] = useTransition()
  const [isActivating, startActivate] = useTransition()

  function handleGenerate() {
    startGenerate(async () => {
      const result = await generateCampaignStrategy(campaign.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        hasStrategy ? "Strategy regenerated" : "Strategy generated",
      )
      setConfirmRegenerate(false)
      router.refresh()
    })
  }

  function handleGenerateClick() {
    if (hasStrategy) {
      setConfirmRegenerate(true)
      return
    }
    handleGenerate()
  }

  function handleSetActive() {
    startActivate(async () => {
      const result = await setActiveCampaign(campaign.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Campaign set as active")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Content strategy</h2>
          <p className="text-sm text-muted-foreground">
            {hasStrategy
              ? `${campaign.completedCount} of ${steps.length} steps completed`
              : "Generate a day-by-day AI strategy for this campaign."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!campaign.is_active ? (
            <Button
              variant="outline"
              onClick={handleSetActive}
              disabled={isActivating || !hasStrategy}
            >
              <Star className="mr-2 size-4" />
              Set as active
            </Button>
          ) : (
            <Badge variant="default" className="h-9 px-3">
              Active campaign
            </Badge>
          )}
          <Button onClick={handleGenerateClick} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                {hasStrategy ? "Regenerate strategy" : "Generate strategy"}
              </>
            )}
          </Button>
        </div>
      </div>

      {hasStrategy ? (
        <div className="grid gap-3">
          {steps
            .slice()
            .sort((a, b) => a.day - b.day)
            .map((step) => (
              <StepCard
                key={step.day}
                step={step}
                campaignId={campaign.id}
                onUpdated={() => router.refresh()}
              />
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No strategy yet. Click Generate strategy to create a{" "}
            {campaign.duration_days}-day content plan.
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="Regenerate strategy?"
        description="This will replace the current strategy and reset all completion progress."
        confirmLabel="Regenerate"
        variant="destructive"
        loading={isGenerating}
        onConfirm={handleGenerate}
      />
    </div>
  )
}
