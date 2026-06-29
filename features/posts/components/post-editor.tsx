"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  CalendarClock,
  ImageIcon,
  Loader2,
  Rocket,
  Share2,
  Smile,
  Type,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createPost, schedulePost, publishNow, updatePost } from "@/features/posts/actions"
import { AiTextToolbar } from "@/features/posts/components/ai-text-toolbar"
import { ScheduleDateTimePicker } from "@/features/calendar/components/schedule-datetime-picker"
import { MediaSection } from "@/features/posts/components/media-section"
import {
  PostEditorSectionIcon,
  PostEditorSidebar,
} from "@/features/posts/components/post-editor-sidebar"
import { PostStatusBadge } from "@/features/posts/components/post-status-badge"
import {
  getPlatformBrandStyle,
  PlatformIconBadge,
} from "@/features/platforms/platform-icons"
import type { PostMediaWithUrl } from "@/features/posts/media-actions"
import {
  canSchedulePost,
  COMMON_EMOJIS,
  formatPostStatus,
  previewSaveStatus,
  TIMEZONES,
} from "@/features/posts/lib/post-status"
import {
  postFormSchema,
  type PostFormValues,
} from "@/lib/validations/post"
import { cn } from "@/lib/utils"
import type { Enums, Tables } from "@/types/database"

const CONTENT_MAX_LENGTH = 5000

interface PostEditorProps {
  mode: "create" | "edit"
  postId?: string
  initialValues?: Partial<PostFormValues>
  platforms: Tables<"platforms">[]
  defaultTimezone?: string
  brandProfileComplete?: boolean
  initialMedia?: PostMediaWithUrl | null
  currentStatus?: Enums<"post_status">
}

export function PostEditor({
  mode,
  postId,
  initialValues,
  platforms,
  defaultTimezone = "UTC",
  brandProfileComplete = false,
  initialMedia = null,
  currentStatus,
}: PostEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues = useMemo<PostFormValues>(
    () => ({
      title: initialValues?.title ?? "",
      content: initialValues?.content ?? "",
      media_type: initialValues?.media_type ?? "none",
      scheduled_at: initialValues?.scheduled_at ?? null,
      timezone: initialValues?.timezone ?? defaultTimezone,
      platform_ids: initialValues?.platform_ids ?? [],
      brand_profile_id: initialValues?.brand_profile_id ?? null,
    }),
    [defaultTimezone, initialValues],
  )

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues,
  })

  const content = form.watch("content")
  const platformIds = form.watch("platform_ids")
  const mediaType = form.watch("media_type")
  const scheduledAt = form.watch("scheduled_at")

  const saveStatusPreview = canSchedulePost({
    content,
    platform_ids: platformIds,
    scheduled_at: scheduledAt,
  })
    ? "scheduled"
    : previewSaveStatus(scheduledAt, currentStatus)
  const isAppManagedStatus =
    currentStatus === "published" ||
    currentStatus === "publishing" ||
    currentStatus === "failed"

  const title = form.watch("title")
  const hasTitle = title.trim().length > 0
  const hasContent = content.trim().length > 0
  const hasSchedule = Boolean(
    scheduledAt && new Date(scheduledAt).getTime() > Date.now(),
  )
  const willScheduleOnCreate =
    mode === "create" &&
    canSchedulePost({
      content,
      platform_ids: platformIds,
      scheduled_at: scheduledAt,
    })
  const hasMedia = mediaType !== "none" || Boolean(initialMedia)
  const isEditMode = mode === "edit"
  const canPublishActions =
    isEditMode && currentStatus !== "publishing" && !isSubmitting

  function togglePlatform(platformId: string, checked: boolean) {
    const current = form.getValues("platform_ids")
    if (checked) {
      form.setValue("platform_ids", [...new Set([...current, platformId])], {
        shouldValidate: true,
      })
      return
    }

    form.setValue(
      "platform_ids",
      current.filter((id) => id !== platformId),
      { shouldValidate: true },
    )
  }

  function insertEmoji(emoji: string) {
    const current = form.getValues("content")
    form.setValue("content", `${current}${emoji}`, { shouldValidate: true })
  }

  async function onSubmit(values: PostFormValues) {
    setIsSubmitting(true)

    const result =
      mode === "create"
        ? await createPost(values)
        : await updatePost(postId!, values)

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    const scheduledOnCreate =
      mode === "create" &&
      canSchedulePost({
        content: values.content,
        platform_ids: values.platform_ids,
        scheduled_at: values.scheduled_at,
      })

    toast.success(
      scheduledOnCreate
        ? "Post scheduled"
        : mode === "create"
          ? "Post created"
          : "Post updated",
    )

    if (mode === "create") {
      router.push(scheduledOnCreate ? "/posts" : `/posts/${result.data.id}/edit`)
    } else {
      router.push("/posts")
    }

    router.refresh()
  }

  async function handleSchedule() {
    if (mode !== "edit" || !postId) {
      return
    }

    const valid = await form.trigger()
    if (!valid) {
      return
    }

    setIsSubmitting(true)
    const result = await schedulePost(postId, form.getValues())
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success("Post scheduled")
    router.push("/posts")
    router.refresh()
  }

  async function handlePublishNow() {
    if (mode !== "edit" || !postId) {
      return
    }

    const valid = await form.trigger()
    if (!valid) {
      return
    }

    setIsSubmitting(true)
    const result = await publishNow(postId, form.getValues())
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    const { publish } = result.data
    if (publish.failed > 0) {
      toast.error("Publish completed with errors")
    } else {
      toast.success("Post published")
    }

    router.push("/posts")
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {isEditMode && currentStatus ? (
        <Alert
          className={cn(
            "border",
            currentStatus === "failed" &&
              "border-red-500/30 bg-red-500/5",
            currentStatus === "published" &&
              "border-emerald-500/30 bg-emerald-500/5",
            currentStatus === "publishing" &&
              "border-amber-500/30 bg-amber-500/5",
            currentStatus === "scheduled" &&
              "border-sky-500/30 bg-sky-500/5",
          )}
        >
          <AlertTitle className="flex flex-wrap items-center gap-2">
            <span>You are editing this post</span>
            <PostStatusBadge status={currentStatus} />
          </AlertTitle>
          <AlertDescription>
            {currentStatus === "publishing"
              ? "Publication is running. Save, schedule, and publish actions are temporarily disabled."
              : currentStatus === "published"
                ? "This post is live. Saving updates your draft record only — use Publish now to push changes to platforms."
                : currentStatus === "failed"
                  ? "The last publish attempt failed. Review your content and platforms, then try Publish now again."
                  : !isAppManagedStatus
                    ? `Saving will mark this post as ${formatPostStatus(saveStatusPreview).toLowerCase()}${saveStatusPreview === "scheduled" ? " based on your scheduled date" : " until you set a future schedule date"}.`
                    : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          isEditMode ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "",
        )}
      >
        <div className="min-w-0 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <PostEditorSectionIcon icon={Type} />
                <div>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>
                    Internal title and the caption your audience will see.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Summer product launch announcement"
                  {...form.register("title")}
                />
                <p className="text-xs text-muted-foreground">
                  For your reference only — not sent to social platforms.
                </p>
                {form.formState.errors.title ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Caption / post text</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {content.length}/{CONTENT_MAX_LENGTH}
                    </span>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Insert emoji"
                          />
                        }
                      >
                        <Smile className="size-4" />
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="grid grid-cols-5 gap-1">
                          {COMMON_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="rounded-md p-2 text-lg hover:bg-muted"
                              onClick={() => insertEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Textarea
                  id="content"
                  rows={8}
                  placeholder="Write your post caption here, or use AI tools below…"
                  {...form.register("content")}
                />
                {form.formState.errors.content ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.content.message}
                  </p>
                ) : null}

                <AiTextToolbar
                  content={content}
                  platformIds={platformIds}
                  postId={postId}
                  brandProfileComplete={brandProfileComplete}
                  onContentChange={(value) =>
                    form.setValue("content", value, { shouldValidate: true })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <PostEditorSectionIcon
                  icon={ImageIcon}
                  className="text-violet-600 dark:text-violet-400"
                />
                <div>
                  <CardTitle>Media</CardTitle>
                  <CardDescription>
                    Optional image or video. AI images use your caption above.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MediaSection
                postId={postId}
                postContent={content}
                brandProfileComplete={brandProfileComplete}
                initialMedia={initialMedia}
                mediaType={mediaType}
                onMediaTypeChange={(value) =>
                  form.setValue("media_type", value, { shouldValidate: true })
                }
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <PostEditorSectionIcon
                  icon={Share2}
                  className="text-primary"
                />
                <div>
                  <CardTitle>Platforms</CardTitle>
                  <CardDescription>
                    Select where this post should be published.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {platforms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No platforms available. Connect Facebook or Instagram in
                  Settings → Social Connections.
                </p>
              ) : (
                platforms.map((platform) => {
                  const selected = platformIds.includes(platform.id)
                  const brand = getPlatformBrandStyle(platform.icon_key)

                  return (
                    <label
                      key={platform.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                        selected
                          ? cn("shadow-sm ring-1 ring-inset", brand.ring, brand.chipBg, brand.chipBorder)
                          : "hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          togglePlatform(platform.id, checked === true)
                        }
                      />
                      <PlatformIconBadge
                        platformKey={platform.icon_key}
                        size="sm"
                      />
                      <span className="text-sm font-medium">
                        {platform.display_name}
                      </span>
                    </label>
                  )
                })
              )}
              {form.formState.errors.platform_ids ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.platform_ids.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <PostEditorSectionIcon
                  icon={CalendarClock}
                  className="text-sky-600 dark:text-sky-400"
                />
                <div>
                  <CardTitle>Schedule</CardTitle>
                  <CardDescription>
                    Leave empty to keep as draft, or pick a future date to
                    schedule.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <strong className="font-medium text-foreground">Draft</strong>{" "}
                — no date or a past date.{" "}
                <strong className="font-medium text-foreground">Scheduled</strong>{" "}
                — future date and time set below.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="scheduled_at">Date & time</Label>
                  <ScheduleDateTimePicker
                    id="scheduled_at"
                    value={scheduledAt}
                    onChange={(value) =>
                      form.setValue("scheduled_at", value, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={form.watch("timezone")}
                    onValueChange={(value) => {
                      if (value) {
                        form.setValue("timezone", value, {
                          shouldValidate: true,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.timezone ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.timezone.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed shadow-sm">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Ready to finish?</p>
                <p className="text-muted-foreground">
                  {isEditMode
                    ? "Save your work, schedule for later, or publish immediately."
                    : willScheduleOnCreate
                      ? "Post text, platform, and a future date are set — saving will schedule and return to Posts."
                      : "Add post text, pick a platform and future date to schedule, or save as draft to continue editing."}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                {isEditMode ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canPublishActions}
                      onClick={() => void handleSchedule()}
                    >
                      <CalendarClock className="size-4" />
                      Schedule
                    </Button>
                    <Button
                      type="button"
                      disabled={!canPublishActions}
                      onClick={() => void handlePublishNow()}
                    >
                      <Rocket className="size-4" />
                      Publish now
                    </Button>
                  </>
                ) : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {mode === "create"
                    ? willScheduleOnCreate
                      ? "Schedule post"
                      : "Save draft"
                    : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {isEditMode && currentStatus ? (
          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <PostEditorSidebar
              currentStatus={currentStatus}
              saveStatusPreview={saveStatusPreview}
              hasTitle={hasTitle}
              hasContent={hasContent}
              platformCount={platformIds.length}
              hasMedia={hasMedia}
              hasSchedule={hasSchedule}
            />
          </aside>
        ) : null}
      </div>
    </form>
  )
}
