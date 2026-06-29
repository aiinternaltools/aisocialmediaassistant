import type { Tables } from "@/types/database"
import type { BrandProfileFormValues } from "@/lib/validations/brand-profile"
import type {
  AiSettingsFormValues,
  AppSettingsFormValues,
} from "@/lib/validations/settings"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type ProductServiceItem = {
  name: string
  description?: string
}

export type { BrandProfileFormValues, AiSettingsFormValues, AppSettingsFormValues }

export type BrandProfileRow = Tables<"brand_profiles">
export type SettingsRow = Tables<"settings">
export type PlatformRow = Tables<"platforms">
export type PlatformConnectionRow = Tables<"platform_connections">
export type BrandAssetRow = Tables<"brand_assets">

export type BrandProfileWithAssets = BrandProfileRow & {
  logoUrl: string | null
  assets: BrandAssetRow[]
}

export type SettingsBundle = SettingsRow

export type PlatformWithConnection = PlatformRow & {
  connection: PlatformConnectionRow | null
}
