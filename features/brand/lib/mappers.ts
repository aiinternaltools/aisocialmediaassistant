import type { BrandProfileWithAssets } from "@/types/app"
import type { BrandProfileFormValues } from "@/lib/validations/brand-profile"
import type { ProductServiceItem } from "@/lib/validations/brand-profile"
import { getDefaultBrandProfile } from "@/features/brand/guards"

export function mapRowToFormValues(
  row: BrandProfileWithAssets,
): BrandProfileFormValues {
  const products = Array.isArray(row.products_services)
    ? (row.products_services as ProductServiceItem[])
    : []

  return {
    id: row.id,
    brand_name: row.brand_name,
    business_description: row.business_description,
    industry: row.industry,
    website: row.website ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    target_audience: row.target_audience,
    brand_voice: row.brand_voice as BrandProfileFormValues["brand_voice"],
    writing_style: row.writing_style as BrandProfileFormValues["writing_style"],
    brand_values: row.brand_values as BrandProfileFormValues["brand_values"],
    products_services: products,
    preferred_ctas:
      row.preferred_ctas as BrandProfileFormValues["preferred_ctas"],
    keywords: row.keywords,
    avoid_words: row.avoid_words,
    competitors: row.competitors,
    color_primary: row.color_primary,
    color_secondary: row.color_secondary,
    color_accent: row.color_accent,
    logo_storage_path: row.logo_storage_path,
  }
}

export function getBrandProfileDefaultValues(
  userId: string,
  profile: BrandProfileWithAssets | null,
): BrandProfileFormValues {
  if (profile) {
    return mapRowToFormValues(profile)
  }

  const defaults = getDefaultBrandProfile(userId)

  return {
    brand_name: defaults.brand_name,
    business_description: defaults.business_description,
    industry: defaults.industry,
    website: "",
    email: "",
    phone: "",
    address: "",
    target_audience: defaults.target_audience,
    brand_voice: defaults.brand_voice as BrandProfileFormValues["brand_voice"],
    writing_style:
      defaults.writing_style as BrandProfileFormValues["writing_style"],
    brand_values: defaults.brand_values as BrandProfileFormValues["brand_values"],
    products_services: [],
    preferred_ctas:
      defaults.preferred_ctas as BrandProfileFormValues["preferred_ctas"],
    keywords: defaults.keywords,
    avoid_words: defaults.avoid_words,
    competitors: defaults.competitors,
    color_primary: defaults.color_primary,
    color_secondary: defaults.color_secondary,
    color_accent: defaults.color_accent,
    logo_storage_path: defaults.logo_storage_path,
  }
}
