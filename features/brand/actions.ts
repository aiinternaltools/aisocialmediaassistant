"use server"

import { revalidatePath } from "next/cache"

import {
  BRAND_ASSET_ACCEPTED_TYPES,
  BRAND_ASSET_MAX_BYTES,
  LOGO_ACCEPTED_TYPES,
  LOGO_MAX_BYTES,
} from "@/features/brand/constants"
import {
  computeBrandProfileComplete,
  getDefaultBrandProfile,
} from "@/features/brand/guards"
import { getWorkspaceUserId } from "@/lib/auth/workspace"
import { AppError } from "@/lib/errors/app-error"
import {
  brandProfileFormSchema,
  type BrandProfileFormValues,
} from "@/lib/validations/brand-profile"
import { createClient } from "@/services/supabase/server"
import type {
  ActionResult,
  BrandAssetRow,
  BrandProfileRow,
  BrandProfileWithAssets,
} from "@/types/app"
import type { Json, TablesInsert } from "@/types/database"

const SETTINGS_PATH = "/settings"

function emptyToNull(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) {
    return null
  }

  return value.trim()
}

async function getSignedLogoUrl(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("logos")
    .createSignedUrl(storagePath, 60 * 60)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

async function attachBrandAssets(
  profile: BrandProfileRow,
): Promise<BrandProfileWithAssets> {
  const supabase = await createClient()
  const { data: assets, error } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("brand_profile_id", profile.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw new AppError({
      code: "INTERNAL",
      message: error.message,
      userMessage: "Failed to load brand assets.",
    })
  }

  const logoUrl = await getSignedLogoUrl(profile.logo_storage_path)

  return {
    ...profile,
    logoUrl,
    assets: assets ?? [],
  }
}

export async function getBrandProfile(): Promise<
  ActionResult<BrandProfileWithAssets | null>
> {
  try {
    const workspaceUserId = await getWorkspaceUserId()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("user_id", workspaceUserId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      throw new AppError({
        code: "INTERNAL",
        message: error.message,
        userMessage: "Failed to load brand profile.",
      })
    }

    if (!data) {
      return { success: true, data: null }
    }

    const profile = await attachBrandAssets(data)
    return { success: true, data: profile }
  } catch (error) {
    return {
      success: false,
      error: AppError.fromUnknown(error).userMessage,
    }
  }
}

export async function upsertBrandProfile(
  values: BrandProfileFormValues,
): Promise<ActionResult<BrandProfileWithAssets>> {
  try {
    const parsed = brandProfileFormSchema.parse(values)
    const workspaceUserId = await getWorkspaceUserId()
    const supabase = await createClient()
    const isComplete = computeBrandProfileComplete(parsed)

    const payload: TablesInsert<"brand_profiles"> = {
      user_id: workspaceUserId,
      brand_name: parsed.brand_name.trim(),
      business_description: parsed.business_description.trim(),
      industry: parsed.industry.trim(),
      website: emptyToNull(parsed.website),
      email: emptyToNull(parsed.email),
      phone: emptyToNull(parsed.phone),
      address: emptyToNull(parsed.address),
      target_audience: parsed.target_audience.trim(),
      brand_voice: parsed.brand_voice,
      writing_style: parsed.writing_style,
      brand_values: parsed.brand_values,
      products_services: parsed.products_services as Json,
      preferred_ctas: parsed.preferred_ctas,
      keywords: parsed.keywords,
      avoid_words: parsed.avoid_words,
      competitors: parsed.competitors,
      color_primary: parsed.color_primary,
      color_secondary: parsed.color_secondary,
      color_accent: parsed.color_accent,
      logo_storage_path: parsed.logo_storage_path,
      is_default: true,
      is_complete: isComplete,
    }

    let profileId = parsed.id

    if (profileId) {
      const { data, error } = await supabase
        .from("brand_profiles")
        .update(payload)
        .eq("id", profileId)
        .eq("user_id", workspaceUserId)
        .select("*")
        .single()

      if (error || !data) {
        throw new AppError({
          code: "INTERNAL",
          message: error?.message ?? "Update failed",
          userMessage: "Failed to save brand profile.",
        })
      }

      revalidatePath(SETTINGS_PATH)
      const profile = await attachBrandAssets(data)
      return { success: true, data: profile }
    }

    const { data, error } = await supabase
      .from("brand_profiles")
      .insert(payload)
      .select("*")
      .single()

    if (error || !data) {
      throw new AppError({
        code: "INTERNAL",
        message: error?.message ?? "Insert failed",
        userMessage: "Failed to save brand profile.",
      })
    }

    revalidatePath(SETTINGS_PATH)
    const profile = await attachBrandAssets(data)
    return { success: true, data: profile }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.userMessage }
    }

    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        error: "Please check the form for validation errors.",
      }
    }

    return {
      success: false,
      error: AppError.fromUnknown(error).userMessage,
    }
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_")
}

function validateUploadFile(
  file: File,
  acceptedTypes: readonly string[],
  maxBytes: number,
): string | null {
  if (!file || file.size === 0) {
    return "No file provided."
  }

  if (file.size > maxBytes) {
    return "File is too large. Maximum size is 10 MB."
  }

  if (!acceptedTypes.includes(file.type)) {
    return "Unsupported file type."
  }

  return null
}

export async function uploadLogo(
  formData: FormData,
): Promise<
  ActionResult<{ storagePath: string; signedUrl: string; profileId?: string }>
> {
  try {
    const workspaceUserId = await getWorkspaceUserId()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return { success: false, error: "No file provided." }
    }

    const validationError = validateUploadFile(
      file,
      LOGO_ACCEPTED_TYPES,
      LOGO_MAX_BYTES,
    )

    if (validationError) {
      return { success: false, error: validationError }
    }

    const supabase = await createClient()
    const storagePath = `${workspaceUserId}/${Date.now()}-${sanitizeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      throw new AppError({
        code: "INTERNAL",
        message: uploadError.message,
        userMessage: "Failed to upload logo.",
      })
    }

    const { data: existingProfile } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", workspaceUserId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle()

    let profileId = existingProfile?.id

    if (profileId) {
      const { error: updateError } = await supabase
        .from("brand_profiles")
        .update({
          logo_storage_path: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)
        .eq("user_id", workspaceUserId)

      if (updateError) {
        throw new AppError({
          code: "INTERNAL",
          message: updateError.message,
          userMessage: "Failed to update logo on profile.",
        })
      }
    } else {
      const defaults = getDefaultBrandProfile(workspaceUserId)
      const { data: createdProfile, error: createError } = await supabase
        .from("brand_profiles")
        .insert({
          ...defaults,
          logo_storage_path: storagePath,
        })
        .select("id")
        .single()

      if (createError || !createdProfile) {
        throw new AppError({
          code: "INTERNAL",
          message: createError?.message ?? "Create failed",
          userMessage: "Failed to create brand profile for logo.",
        })
      }

      profileId = createdProfile.id
    }

    const signedUrl = await getSignedLogoUrl(storagePath)

    revalidatePath(SETTINGS_PATH)

    return {
      success: true,
      data: {
        storagePath,
        signedUrl: signedUrl ?? "",
        profileId,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: AppError.fromUnknown(error).userMessage,
    }
  }
}

export async function uploadBrandAsset(
  formData: FormData,
): Promise<ActionResult<BrandAssetRow>> {
  try {
    const workspaceUserId = await getWorkspaceUserId()
    const file = formData.get("file")
    const brandProfileId = formData.get("brand_profile_id")
    const assetType = formData.get("asset_type")

    if (!(file instanceof File)) {
      return { success: false, error: "No file provided." }
    }

    if (typeof brandProfileId !== "string" || brandProfileId.length === 0) {
      return {
        success: false,
        error: "Save your brand profile before uploading assets.",
      }
    }

    if (typeof assetType !== "string" || assetType.length === 0) {
      return { success: false, error: "Asset type is required." }
    }

    const validationError = validateUploadFile(
      file,
      BRAND_ASSET_ACCEPTED_TYPES,
      BRAND_ASSET_MAX_BYTES,
    )

    if (validationError) {
      return { success: false, error: validationError }
    }

    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("id", brandProfileId)
      .eq("user_id", workspaceUserId)
      .is("deleted_at", null)
      .maybeSingle()

    if (profileError || !profile) {
      return { success: false, error: "Brand profile not found." }
    }

    const storagePath = `${workspaceUserId}/${Date.now()}-${sanitizeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      throw new AppError({
        code: "INTERNAL",
        message: uploadError.message,
        userMessage: "Failed to upload brand asset.",
      })
    }

    const { data: asset, error: insertError } = await supabase
      .from("brand_assets")
      .insert({
        brand_profile_id: brandProfileId,
        asset_type: assetType,
        file_name: file.name,
        mime_type: file.type,
        storage_path: storagePath,
      })
      .select("*")
      .single()

    if (insertError || !asset) {
      throw new AppError({
        code: "INTERNAL",
        message: insertError?.message ?? "Insert failed",
        userMessage: "Failed to save brand asset record.",
      })
    }

    revalidatePath(SETTINGS_PATH)
    return { success: true, data: asset }
  } catch (error) {
    return {
      success: false,
      error: AppError.fromUnknown(error).userMessage,
    }
  }
}

