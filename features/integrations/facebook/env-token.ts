import { getMetaAppConfig } from "@/features/integrations/facebook/config"
import { graphRequest } from "@/features/integrations/facebook/meta-graph-client"
import { IntegrationError } from "@/features/integrations/shared/errors"
import { decryptToken } from "@/features/integrations/shared/token-encryption"
import type { OAuthTokens } from "@/features/integrations/types"

const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "public_profile",
]

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function hasEnvFacebookPageToken(): boolean {
  return Boolean(normalizeEnvValue(process.env.FACEBOOK_PAGE_ACCESS_TOKEN))
}

export function getEnvFacebookPageAccessToken(): string {
  const token = normalizeEnvValue(process.env.FACEBOOK_PAGE_ACCESS_TOKEN)
  if (!token) {
    throw new IntegrationError({
      code: "VALIDATION",
      message: "FACEBOOK_PAGE_ACCESS_TOKEN is not configured",
      userMessage:
        "Facebook Page access token is not configured on the server.",
    })
  }
  return token
}

export type PageTokenStatus = {
  isValid: boolean
  expiresAt: string | null
  error: string | null
}

export async function inspectEnvPageToken(): Promise<PageTokenStatus | null> {
  if (!hasEnvFacebookPageToken()) {
    return null
  }

  const config = getMetaAppConfig()
  if (!config) {
    return { isValid: false, expiresAt: null, error: "App credentials not configured" }
  }

  const inputToken = getEnvFacebookPageAccessToken()
  const appAccessToken = `${config.appId}|${config.appSecret}`

  try {
    const result = await graphRequest<{
      data?: {
        is_valid?: boolean
        expires_at?: number
        error?: { message?: string }
      }
    }>("/debug_token", {
      params: {
        input_token: inputToken,
        access_token: appAccessToken,
      },
    })

    const data = result.data
    if (!data) {
      return { isValid: false, expiresAt: null, error: "Token validation returned no data" }
    }

    if (data.is_valid === false) {
      return {
        isValid: false,
        expiresAt: null,
        error: data.error?.message ?? "Page access token is invalid",
      }
    }

    const expiresAt =
      data.expires_at && data.expires_at > 0
        ? new Date(data.expires_at * 1000).toISOString()
        : null

    return { isValid: true, expiresAt, error: null }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate page token"
    return { isValid: false, expiresAt: null, error: message }
  }
}

type EnvPageTokenConnection = {
  access_token_encrypted: string | null
  metadata?: unknown
}

/** Prefer live env page token when the connection was created via env token flow. */
export function resolveConnectionAccessToken(
  connection: EnvPageTokenConnection,
): string {
  const metadata =
    connection.metadata &&
    typeof connection.metadata === "object" &&
    !Array.isArray(connection.metadata)
      ? (connection.metadata as Record<string, unknown>)
      : {}
  if (metadata.source === "env_page_token" && hasEnvFacebookPageToken()) {
    return getEnvFacebookPageAccessToken()
  }

  if (!connection.access_token_encrypted) {
    throw new IntegrationError({
      code: "VALIDATION",
      message: "Connection has no stored access token",
      userMessage: "No active connection token. Reconnect this platform in Settings.",
    })
  }

  return decryptToken(connection.access_token_encrypted)
}

async function resolvePageFromToken(
  accessToken: string,
): Promise<{ id: string; name: string }> {
  const configuredPageId = normalizeEnvValue(process.env.FACEBOOK_PAGE_ID)
  const configuredPageName = normalizeEnvValue(process.env.FACEBOOK_PAGE_NAME)

  if (configuredPageId) {
    if (configuredPageName) {
      return { id: configuredPageId, name: configuredPageName }
    }

    const page = await graphRequest<{ id: string; name: string }>(
      `/${configuredPageId}`,
      {
        accessToken,
        params: { fields: "id,name" },
      },
    )

    return { id: page.id, name: page.name }
  }

  const identity = await graphRequest<{ id: string; name: string }>("/me", {
    accessToken,
    params: { fields: "id,name" },
  })

  if (!identity.id) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message: "Token validation returned no page id",
      userMessage: "Facebook token is invalid or expired.",
    })
  }

  return { id: identity.id, name: identity.name }
}

export async function buildFacebookTokensFromEnv(): Promise<OAuthTokens> {
  const accessToken = getEnvFacebookPageAccessToken()
  const page = await resolvePageFromToken(accessToken)

  return {
    accessToken,
    refreshToken: null,
    expiresAt: null,
    scopes: FACEBOOK_SCOPES,
    externalAccountId: page.id,
    accountName: page.name,
    metadata: {
      pageId: page.id,
      source: "env_page_token",
    },
  }
}

type InstagramBusinessAccount = {
  id: string
  username?: string
}

type PageWithInstagram = {
  id: string
  name: string
  instagram_business_account?: InstagramBusinessAccount
}

export async function resolveInstagramFromPageToken(
  accessToken: string,
): Promise<{ page: { id: string; name: string }; igAccount: InstagramBusinessAccount }> {
  const configuredPageId = normalizeEnvValue(process.env.FACEBOOK_PAGE_ID)
  const fields = "id,name,instagram_business_account{id,username}"

  async function fetchPage(path: string): Promise<PageWithInstagram> {
    return graphRequest<PageWithInstagram>(path, {
      accessToken,
      params: { fields },
    })
  }

  let page: PageWithInstagram
  try {
    page = configuredPageId
      ? await fetchPage(`/${configuredPageId}`)
      : await fetchPage("/me")
  } catch (error) {
    if (configuredPageId) {
      try {
        page = await fetchPage("/me")
      } catch (fallbackError) {
        throw fallbackError
      }
    } else {
      throw error
    }
  }

  if (!page.instagram_business_account?.id) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message: `Page "${page.name}" has no linked Instagram Business account`,
      userMessage:
        "This Facebook Page is not linked to an Instagram Business account. Connect one in Meta Business Suite, then try again.",
    })
  }

  return {
    page: { id: page.id, name: page.name },
    igAccount: page.instagram_business_account,
  }
}
