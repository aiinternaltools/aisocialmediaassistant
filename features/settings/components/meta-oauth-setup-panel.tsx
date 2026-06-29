import {
  getAppBaseUrl,
  getMetaAppConfig,
  getMetaLoginConfigId,
  getOAuthRedirectUri,
} from "@/features/integrations/facebook/config"
import { MetaOAuthSetupNotice } from "@/features/settings/components/meta-oauth-setup-notice"

export function MetaOAuthSetupPanel() {
  const config = getMetaAppConfig()
  if (!config) {
    return null
  }

  const appBaseUrl = getAppBaseUrl()
  const appDomain = (() => {
    try {
      return new URL(appBaseUrl).hostname
    } catch {
      return "localhost"
    }
  })()

  const configId = getMetaLoginConfigId()
  const configurationsUrl = `https://developers.facebook.com/apps/${config.appId}/business-login/configurations/`

  return (
    <MetaOAuthSetupNotice
      appId={config.appId}
      appBaseUrl={appBaseUrl}
      appDomain={appDomain}
      facebookRedirectUri={getOAuthRedirectUri("facebook")}
      instagramRedirectUri={getOAuthRedirectUri("instagram")}
      configId={configId}
      configurationsUrl={configurationsUrl}
    />
  )
}
