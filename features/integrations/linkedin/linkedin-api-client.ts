import {
  getLinkedInAppConfig,
  type LinkedInAppConfig,
} from "@/features/integrations/linkedin/config"
import { IntegrationError } from "@/features/integrations/shared/errors"

const LINKEDIN_API_BASE = "https://api.linkedin.com"

export type LinkedInTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope?: string
  token_type?: string
  id_token?: string
}

export type LinkedInOpenIdClaims = {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  picture?: string
}

export type LinkedInMemberProfile = {
  id: string
  localizedFirstName?: string
  localizedLastName?: string
  vanityName?: string
}

type LinkedInRequestOptions = {
  method?: "GET" | "POST" | "PUT"
  accessToken?: string
  body?: Record<string, unknown>
  apiVersion?: string
}

type LinkedInErrorBody = {
  message?: string
  status?: number
  code?: string
}

function requireConfig(): LinkedInAppConfig {
  const config = getLinkedInAppConfig()
  if (!config) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message: "LinkedIn app credentials are not configured",
      userMessage: "LinkedIn OAuth is not configured.",
    })
  }
  return config
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${LINKEDIN_API_BASE}${normalizedPath}`
}

function getLinkedInHeaders(
  config: LinkedInAppConfig,
  accessToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Linkedin-Version": config.apiVersion,
    "X-Restli-Protocol-Version": "2.0.0",
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

async function parseErrorResponse(
  response: Response,
): Promise<LinkedInErrorBody | string> {
  try {
    return (await response.json()) as LinkedInErrorBody
  } catch {
    return await response.text()
  }
}

export async function linkedinRequest<T = Record<string, unknown>>(
  path: string,
  options: LinkedInRequestOptions = {},
): Promise<{ data: T; headers: Headers }> {
  const config = requireConfig()
  const method = options.method ?? "GET"
  const headers = getLinkedInHeaders(config, options.accessToken)

  if (options.body) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response)
    const message =
      typeof errorBody === "string"
        ? errorBody
        : errorBody.message ?? `LinkedIn API request failed (${response.status})`

    throw new IntegrationError({
      code: "EXTERNAL_SERVICE",
      message,
      userMessage: `LinkedIn API error: ${message}`,
      cause: errorBody,
    })
  }

  if (response.status === 204) {
    return { data: {} as T, headers: response.headers }
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as T) : ({} as T)
  return { data, headers: response.headers }
}

async function exchangeToken(
  params: Record<string, string>,
): Promise<LinkedInTokenResponse> {
  const config = requireConfig()
  const body = new URLSearchParams(params)

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  })

  const payload = (await response.json()) as LinkedInTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message:
        payload.error_description ??
        payload.error ??
        "Failed to exchange LinkedIn OAuth token",
      userMessage: "Could not complete LinkedIn authorization.",
      cause: payload,
    })
  }

  return payload
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string,
): Promise<LinkedInTokenResponse> {
  const config = requireConfig()
  return exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })
}

export async function refreshLinkedInToken(
  refreshToken: string,
): Promise<LinkedInTokenResponse> {
  const config = requireConfig()
  return exchangeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })
}

export function parseLinkedInIdToken(idToken: string): LinkedInOpenIdClaims {
  const parts = idToken.split(".")
  if (parts.length < 2) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message: "Invalid LinkedIn id_token format",
      userMessage: "Could not read your LinkedIn identity from the token.",
    })
  }

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")
  const decoded = JSON.parse(
    Buffer.from(padded, "base64").toString("utf8"),
  ) as LinkedInOpenIdClaims

  if (!decoded.sub) {
    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message: "LinkedIn id_token missing sub claim",
      userMessage: "Could not read your LinkedIn member ID.",
    })
  }

  return decoded
}

function openIdClaimsToProfile(claims: LinkedInOpenIdClaims): LinkedInMemberProfile {
  return {
    id: claims.sub,
    localizedFirstName: claims.given_name,
    localizedLastName: claims.family_name,
    vanityName: claims.name,
  }
}

async function fetchLinkedInUserInfo(
  accessToken: string,
): Promise<LinkedInOpenIdClaims> {
  const response = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response)
    const message =
      typeof errorBody === "string"
        ? errorBody
        : errorBody.message ?? `userinfo failed (${response.status})`

    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message,
      userMessage: message,
      cause: errorBody,
    })
  }

  return (await response.json()) as LinkedInOpenIdClaims
}

async function fetchLinkedInV2Me(accessToken: string): Promise<LinkedInMemberProfile> {
  const response = await fetch(
    `${LINKEDIN_API_BASE}/v2/me?projection=(id,localizedFirstName,localizedLastName,vanityName)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      cache: "no-store",
    },
  )

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response)
    const message =
      typeof errorBody === "string"
        ? errorBody
        : errorBody.message ?? `/v2/me failed (${response.status})`

    throw new IntegrationError({
      code: "OAUTH_FAILED",
      message,
      userMessage: message,
      cause: errorBody,
    })
  }

  return (await response.json()) as LinkedInMemberProfile
}

const LINKEDIN_PROFILE_SETUP_HINT =
  "Add the “Sign In with LinkedIn using OpenID Connect” product in your LinkedIn Developer app (Products tab), then reconnect."

export async function resolveLinkedInMemberProfile(options: {
  accessToken: string
  idToken?: string | null
}): Promise<LinkedInMemberProfile> {
  if (options.idToken) {
    return openIdClaimsToProfile(parseLinkedInIdToken(options.idToken))
  }

  try {
    return openIdClaimsToProfile(await fetchLinkedInUserInfo(options.accessToken))
  } catch (userinfoError) {
    try {
      return await fetchLinkedInV2Me(options.accessToken)
    } catch {
      const detail =
        userinfoError instanceof IntegrationError
          ? userinfoError.userMessage
          : "Profile lookup failed"

      throw new IntegrationError({
        code: "OAUTH_FAILED",
        message: detail,
        userMessage: `${detail} ${LINKEDIN_PROFILE_SETUP_HINT}`,
        cause: userinfoError,
      })
    }
  }
}

export async function fetchLinkedInMemberProfile(
  accessToken: string,
): Promise<LinkedInMemberProfile> {
  return resolveLinkedInMemberProfile({ accessToken })
}

type InitializeImageUploadResponse = {
  value: {
    uploadUrl: string
    image: string
  }
}

export async function uploadLinkedInImageFromUrl(
  accessToken: string,
  authorUrn: string,
  imageUrl: string,
): Promise<string> {
  const imageResponse = await fetch(imageUrl, { cache: "no-store" })
  if (!imageResponse.ok) {
    throw new IntegrationError({
      code: "PUBLISH_FAILED",
      message: `Failed to fetch image (${imageResponse.status})`,
      userMessage: "Could not download the image for LinkedIn.",
    })
  }

  const contentType =
    imageResponse.headers.get("content-type") ?? "application/octet-stream"
  const imageBytes = await imageResponse.arrayBuffer()

  const { data: initData } =
    await linkedinRequest<InitializeImageUploadResponse>(
      "/rest/images?action=initializeUpload",
      {
        method: "POST",
        accessToken,
        body: {
          initializeUploadRequest: {
            owner: authorUrn,
          },
        },
      },
    )

  const uploadResponse = await fetch(initData.value.uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBytes,
    cache: "no-store",
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new IntegrationError({
      code: "PUBLISH_FAILED",
      message: errorText || `Image upload failed (${uploadResponse.status})`,
      userMessage: "LinkedIn rejected the image upload.",
    })
  }

  return initData.value.image
}

export async function createLinkedInPost(
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const { headers } = await linkedinRequest("/rest/posts", {
    method: "POST",
    accessToken,
    body: payload,
  })

  const postId = headers.get("x-restli-id")
  if (!postId) {
    throw new IntegrationError({
      code: "PUBLISH_FAILED",
      message: "LinkedIn post created but no post ID returned",
      userMessage: "LinkedIn publish succeeded but no post ID was returned.",
    })
  }

  return postId
}
