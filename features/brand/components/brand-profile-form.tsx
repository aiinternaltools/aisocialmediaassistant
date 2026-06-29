"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ImagePlus, Plus, Trash2, Upload, X } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  upsertBrandProfile,
  uploadBrandAsset,
  uploadLogo,
} from "@/features/brand/actions"
import {
  BRAND_ASSET_TYPES,
  BRAND_VALUES_OPTIONS,
  BRAND_VOICE_OPTIONS,
  CTA_OPTIONS,
  WRITING_STYLE_OPTIONS,
} from "@/features/brand/constants"
import { computeBrandProfileComplete } from "@/features/brand/guards"
import { getBrandProfileDefaultValues } from "@/features/brand/lib/mappers"
import {
  brandProfileFormSchema,
  type BrandProfileFormValues,
} from "@/lib/validations/brand-profile"
import type { BrandAssetRow, BrandProfileWithAssets } from "@/types/app"
import { cn } from "@/lib/utils"

interface BrandProfileFormProps {
  userId: string
  initialProfile: BrandProfileWithAssets | null
}

interface MultiSelectChipsProps<T extends string> {
  options: readonly T[]
  value: T[]
  onChange: (value: T[]) => void
  disabled?: boolean
}

function MultiSelectChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: MultiSelectChipsProps<T>) {
  const toggle = (option: T) => {
    if (disabled) {
      return
    }

    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option))
      return
    }

    onChange([...value, option])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option)

        return (
          <Badge
            key={option}
            variant={selected ? "default" : "outline"}
            className={cn(
              "cursor-pointer select-none",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={() => toggle(option)}
          >
            {option}
          </Badge>
        )
      })}
    </div>
  )
}

interface TagInputProps {
  label: string
  description?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
}

function TagInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const addTag = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || value.includes(trimmed)) {
      setInputValue("")
      return
    }

    onChange([...value, trimmed])
    setInputValue("")
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addTag()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          disabled={disabled}
        >
          Add
        </Button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                className="rounded-sm hover:text-destructive"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

function ColorField({
  label,
  value,
  onChange,
  error,
  disabled,
}: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="font-mono uppercase"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function BrandProfileForm({
  userId,
  initialProfile,
}: BrandProfileFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const assetInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploadingLogo, startLogoUpload] = useTransition()
  const [isUploadingAsset, startAssetUpload] = useTransition()
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initialProfile?.logoUrl ?? null,
  )
  const [assets, setAssets] = useState<BrandAssetRow[]>(
    initialProfile?.assets ?? [],
  )
  const [assetType, setAssetType] = useState<string>("guidelines")

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BrandProfileFormValues>({
    resolver: zodResolver(brandProfileFormSchema),
    defaultValues: getBrandProfileDefaultValues(userId, initialProfile),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products_services",
  })

  const profileId = watch("id")
  const watchedValues = watch()
  const isComplete = computeBrandProfileComplete(watchedValues)

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await upsertBrandProfile(values)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setValue("id", result.data.id)
      setLogoPreviewUrl(result.data.logoUrl)
      setAssets(result.data.assets)
      toast.success(
        result.data.is_complete
          ? "Brand profile saved and complete."
          : "Brand profile saved. Complete all fields for the best AI results.",
      )
    })
  })

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    startLogoUpload(async () => {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadLogo(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setValue("logo_storage_path", result.data.storagePath, {
        shouldValidate: true,
      })
      setLogoPreviewUrl(result.data.signedUrl)

      if (result.data.profileId) {
        setValue("id", result.data.profileId)
      }

      toast.success("Logo uploaded.")
    })

    event.target.value = ""
  }

  const handleAssetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const currentProfileId = profileId ?? initialProfile?.id

    if (!file) {
      return
    }

    if (!currentProfileId) {
      toast.error("Save your brand profile before uploading assets.")
      return
    }

    startAssetUpload(async () => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("brand_profile_id", currentProfileId)
      formData.append("asset_type", assetType)

      const result = await uploadBrandAsset(formData)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setAssets((current) => [result.data, ...current])
      toast.success("Brand asset uploaded.")
    })

    event.target.value = ""
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" {...register("id")} />
      {!isComplete ? (
        <Alert>
          <AlertDescription>
            Complete all required fields and upload a logo to enable AI
            features. AI generation stays disabled until your profile is
            complete.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertDescription>
            Your brand profile is complete. AI features can use this context.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
          <CardDescription>
            Core business details used in every AI prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brand_name">Brand Name</Label>
            <Input
              id="brand_name"
              disabled={isPending}
              aria-invalid={Boolean(errors.brand_name)}
              {...register("brand_name")}
            />
            {errors.brand_name ? (
              <p className="text-sm text-destructive">
                {errors.brand_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              rows={4}
              disabled={isPending}
              aria-invalid={Boolean(errors.business_description)}
              {...register("business_description")}
            />
            {errors.business_description ? (
              <p className="text-sm text-destructive">
                {errors.business_description.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              disabled={isPending}
              aria-invalid={Boolean(errors.industry)}
              {...register("industry")}
            />
            {errors.industry ? (
              <p className="text-sm text-destructive">
                {errors.industry.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              disabled={isPending}
              {...register("website")}
            />
            {errors.website ? (
              <p className="text-sm text-destructive">
                {errors.website.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              disabled={isPending}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" disabled={isPending} {...register("phone")} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" disabled={isPending} {...register("address")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience & Voice</CardTitle>
          <CardDescription>
            Define who you speak to and how your brand sounds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="target_audience">Target Audience</Label>
            <Textarea
              id="target_audience"
              rows={3}
              disabled={isPending}
              aria-invalid={Boolean(errors.target_audience)}
              {...register("target_audience")}
            />
            {errors.target_audience ? (
              <p className="text-sm text-destructive">
                {errors.target_audience.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Controller
              control={control}
              name="brand_voice"
              render={({ field }) => (
                <MultiSelectChips
                  options={BRAND_VOICE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {errors.brand_voice ? (
              <p className="text-sm text-destructive">
                {errors.brand_voice.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Writing Style</Label>
            <Controller
              control={control}
              name="writing_style"
              render={({ field }) => (
                <MultiSelectChips
                  options={WRITING_STYLE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {errors.writing_style ? (
              <p className="text-sm text-destructive">
                {errors.writing_style.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Brand Values</Label>
            <Controller
              control={control}
              name="brand_values"
              render={({ field }) => (
                <MultiSelectChips
                  options={BRAND_VALUES_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {errors.brand_values ? (
              <p className="text-sm text-destructive">
                {errors.brand_values.message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products & Services</CardTitle>
          <CardDescription>
            List what you offer so AI can reference it accurately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`product-name-${index}`}>Name</Label>
                <Input
                  id={`product-name-${index}`}
                  disabled={isPending}
                  {...register(`products_services.${index}.name`)}
                />
                {errors.products_services?.[index]?.name ? (
                  <p className="text-sm text-destructive">
                    {errors.products_services[index]?.name?.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`product-description-${index}`}>
                  Description
                </Label>
                <Input
                  id={`product-description-${index}`}
                  disabled={isPending}
                  {...register(`products_services.${index}.description`)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label="Remove product or service"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          {errors.products_services?.root ? (
            <p className="text-sm text-destructive">
              {errors.products_services.root.message}
            </p>
          ) : null}
          {typeof errors.products_services?.message === "string" ? (
            <p className="text-sm text-destructive">
              {errors.products_services.message}
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => append({ name: "", description: "" })}
          >
            <Plus className="size-4" />
            Add product or service
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Preferred Call-to-Actions</Label>
            <Controller
              control={control}
              name="preferred_ctas"
              render={({ field }) => (
                <MultiSelectChips
                  options={CTA_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {errors.preferred_ctas ? (
              <p className="text-sm text-destructive">
                {errors.preferred_ctas.message}
              </p>
            ) : null}
          </div>

          <Controller
            control={control}
            name="keywords"
            render={({ field }) => (
              <TagInput
                label="Keywords"
                description="SEO keywords the AI should weave into content when relevant."
                value={field.value}
                onChange={field.onChange}
                placeholder="Add a keyword"
                disabled={isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="avoid_words"
            render={({ field }) => (
              <TagInput
                label="Avoid Words"
                description="Words the AI should never use."
                value={field.value}
                onChange={field.onChange}
                placeholder="Add a word to avoid"
                disabled={isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="competitors"
            render={({ field }) => (
              <TagInput
                label="Competitors"
                description="Optional competitor names for positioning context."
                value={field.value}
                onChange={field.onChange}
                placeholder="Add a competitor"
                disabled={isPending}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            Colors guide AI image generation and visual consistency.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Controller
            control={control}
            name="color_primary"
            render={({ field }) => (
              <ColorField
                label="Primary"
                value={field.value}
                onChange={field.onChange}
                error={errors.color_primary?.message}
                disabled={isPending}
              />
            )}
          />
          <Controller
            control={control}
            name="color_secondary"
            render={({ field }) => (
              <ColorField
                label="Secondary"
                value={field.value}
                onChange={field.onChange}
                error={errors.color_secondary?.message}
                disabled={isPending}
              />
            )}
          />
          <Controller
            control={control}
            name="color_accent"
            render={({ field }) => (
              <ColorField
                label="Accent"
                value={field.value}
                onChange={field.onChange}
                error={errors.color_accent?.message}
                disabled={isPending}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload your logo. Required to complete your brand profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewUrl}
                  alt="Brand logo preview"
                  className="size-full object-contain"
                />
              ) : (
                <ImagePlus className="size-8 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="size-4" />
                {isUploadingLogo ? "Uploading..." : "Upload logo"}
              </Button>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, WebP, or SVG up to 10 MB.
              </p>
            </div>
          </div>

          {errors.logo_storage_path ? (
            <p className="text-sm text-destructive">
              {errors.logo_storage_path.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Assets</CardTitle>
          <CardDescription>
            Optional guidelines, fonts, or reference images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assets.length > 0 ? (
            <ul className="space-y-2">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{asset.file_name}</p>
                    <p className="text-muted-foreground capitalize">
                      {asset.asset_type}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No brand assets uploaded yet.
            </p>
          )}

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:w-56">
              <Label>Asset type</Label>
              <Select
                value={assetType}
                onValueChange={(value) => {
                  if (value) {
                    setAssetType(value)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_ASSET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <input
                ref={assetInputRef}
                type="file"
                className="hidden"
                onChange={handleAssetUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending || isUploadingAsset}
                onClick={() => assetInputRef.current?.click()}
              >
                <Upload className="size-4" />
                {isUploadingAsset ? "Uploading..." : "Upload asset"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save brand profile"}
        </Button>
      </div>
    </form>
  )
}
