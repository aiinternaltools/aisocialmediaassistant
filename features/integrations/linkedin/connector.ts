import {
  buildLinkedInOAuthUrl,
  getLinkedInOAuthRedirectUri,
  isLinkedInDevStubMode,
  LINKEDIN_SCOPES,
} from "@/features/integrations/linkedin/config"
import {
  createLinkedInPost,
  exchangeLinkedInCode,
  resolveLinkedInMemberProfile,
  refreshLinkedInToken,
  uploadLinkedInImageFromUrl,
} from "@/features/integrations/linkedin/linkedin-api-client"
import { IntegrationError } from "@/features/integrations/shared/errors"
import type {
  ConnectionContext,
  OAuthTokens,
  PublishInput,
  PublishResult,
  SocialPlatformConnector,
} from "@/features/integrations/types"

function buildPersonUrn(personId: string): string {
  return `urn:li:person:${personId}`
}

function resolveAuthorUrn(connection: ConnectionContext): string {
  const metadataUrn = connection.metadata?.authorUrn as string | undefined
  if (metadataUrn) {
    return metadataUrn
  }

  return buildPersonUrn(connection.externalAccountId)
}

function buildDevStubTokens(): OAuthTokens {
  return {
    accessToken: "dev_linkedin_access_token",
    refreshToken: "dev_linkedin_refresh_token",
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    scopes: [...LINKEDIN_SCOPES],
    externalAccountId: "dev_linkedin_person",
    accountName: "Dev LinkedIn Profile",
    metadata: {
      devStub: true,
      authorUrn: buildPersonUrn("dev_linkedin_person"),
      personId: "dev_linkedin_person",
    },
  }
}

function formatMemberName(profile: {
  localizedFirstName?: string
  localizedLastName?: string
  vanityName?: string
}): string {
  const fullName = [profile.localizedFirstName, profile.localizedLastName]
    .filter(Boolean)
    .join(" ")

  return fullName || profile.vanityName || "LinkedIn Profile"
}

async function resolveMemberTokens(
  tokenResponse: Awaited<ReturnType<typeof exchangeLinkedInCode>>,
): Promise<OAuthTokens> {
  const profile = await resolveLinkedInMemberProfile({
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token,
  })
  const personId = profile.id
  const accountName = formatMemberName(profile)

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? null,
    expiresAt: tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : null,
    scopes: tokenResponse.scope?.split(" ") ?? [...LINKEDIN_SCOPES],
    externalAccountId: personId,
    accountName,
    metadata: {
      authorUrn: buildPersonUrn(personId),
      personId,
    },
  }
}

export const linkedinConnector: SocialPlatformConnector = {
  platformId: "linkedin",
  displayName: "LinkedIn",

  getAuthUrl(state: string, redirectUri: string): string {
    if (isLinkedInDevStubMode()) {
      const params = new URLSearchParams({
        code: "dev_stub",
        state,
      })
      return `${redirectUri}?${params.toString()}`
    }

    return buildLinkedInOAuthUrl({ state, redirectUri })
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    if (isLinkedInDevStubMode() || code === "dev_stub") {
      return buildDevStubTokens()
    }

    const tokenResponse = await exchangeLinkedInCode(code, redirectUri)
    return resolveMemberTokens(tokenResponse)
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    if (isLinkedInDevStubMode()) {
      return buildDevStubTokens()
    }

    const tokenResponse = await refreshLinkedInToken(refreshToken)
    return resolveMemberTokens(tokenResponse)
  },

  async getAccountInfo(accessToken: string): Promise<ConnectionContext> {
    if (isLinkedInDevStubMode()) {
      return {
        externalAccountId: "dev_linkedin_person",
        accountName: "Dev LinkedIn Profile",
        metadata: {
          devStub: true,
          authorUrn: buildPersonUrn("dev_linkedin_person"),
          personId: "dev_linkedin_person",
        },
      }
    }

    const profile = await resolveLinkedInMemberProfile({ accessToken })
    const personId = profile.id

    return {
      externalAccountId: personId,
      accountName: formatMemberName(profile),
      metadata: {
        authorUrn: buildPersonUrn(personId),
        personId,
      },
    }
  },

  async publish(
    accessToken: string,
    input: PublishInput,
    connection: ConnectionContext,
  ): Promise<PublishResult> {
    const authorUrn = resolveAuthorUrn(connection)

    if (isLinkedInDevStubMode()) {
      return {
        success: true,
        externalPostId: `dev_li_${Date.now()}`,
        requestPayload: {
          authorUrn,
          commentary: input.text,
          imageUrl: input.imageUrl ?? null,
        },
        responsePayload: {
          id: `dev_li_${Date.now()}`,
          devStub: true,
        },
      }
    }

    try {
      const postPayload: Record<string, unknown> = {
        author: authorUrn,
        commentary: input.text,
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
      }

      if (input.imageUrl) {
        const imageUrn = await uploadLinkedInImageFromUrl(
          accessToken,
          authorUrn,
          input.imageUrl,
        )
        postPayload.content = {
          media: {
            id: imageUrn,
          },
        }
      }

      const externalPostId = await createLinkedInPost(accessToken, postPayload)

      return {
        success: true,
        externalPostId,
        requestPayload: {
          authorUrn,
          commentary: input.text,
          imageUrl: input.imageUrl ?? null,
        },
        responsePayload: { id: externalPostId },
      }
    } catch (error) {
      const message =
        error instanceof IntegrationError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : "LinkedIn publish failed"

      return {
        success: false,
        error: message,
        requestPayload: {
          authorUrn,
          commentary: input.text,
          imageUrl: input.imageUrl ?? null,
        },
        responsePayload:
          error instanceof IntegrationError && error.cause
            ? (error.cause as Record<string, unknown>)
            : undefined,
      }
    }
  },
}

export { getLinkedInOAuthRedirectUri }
