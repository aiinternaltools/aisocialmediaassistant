"use client"

import { ExternalLink } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetaOAuthSetupNoticeProps {
  appId: string
  appBaseUrl: string
  appDomain: string
  facebookRedirectUri: string
  instagramRedirectUri: string
  configId: string | null
  configurationsUrl: string
}

function CopyValue({ label, value }: { label: string; value: string }) {
  async function copy() {
    await navigator.clipboard.writeText(value)
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <Button type="button" variant="ghost" size="xs" onClick={() => void copy()}>
          Copy
        </Button>
      </div>
    </div>
  )
}

export function MetaOAuthSetupNotice({
  appId,
  appBaseUrl,
  appDomain,
  facebookRedirectUri,
  instagramRedirectUri,
  configId,
  configurationsUrl,
}: MetaOAuthSetupNoticeProps) {
  const metaAppUrl = `https://developers.facebook.com/apps/${appId}/settings/basic/`
  const usesHttps = appBaseUrl.startsWith("https://")

  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Meta OAuth setup (Facebook Login for Business)</CardTitle>
        <CardDescription>
          Business apps register redirect URIs under{" "}
          <strong className="text-foreground">Configurations</strong>, not Settings.
          Enforce HTTPS is locked — use an{" "}
          <strong className="text-foreground">https://</strong> app URL (ngrok or Vercel).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!usesHttps ? (
          <Alert variant="destructive">
            <AlertTitle className="text-sm">HTTPS required</AlertTitle>
            <AlertDescription className="text-sm">
              Your app URL is <code className="text-xs">{appBaseUrl}</code>. Meta
              Business Login requires HTTPS. Run{" "}
              <code className="text-xs">ngrok http 3000</code>, set{" "}
              <code className="text-xs">NEXT_PUBLIC_APP_URL</code> to the ngrok
              URL, restart the dev server, then use that URL in Meta.
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <AlertTitle className="text-sm">Create a Configuration in Meta</AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Open{" "}
                <a
                  href={configurationsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  Facebook Login for Business → Configurations
                  <ExternalLink className="size-3" />
                </a>
              </li>
              <li>
                Click <strong>Create configuration</strong> (or use template
                &quot;Instagram API&quot; if posting to IG)
              </li>
              <li>
                Token type: <strong>User access token</strong>
              </li>
              <li>
                Permissions: at least{" "}
                <code className="text-xs">pages_show_list</code>,{" "}
                <code className="text-xs">pages_read_engagement</code>,{" "}
                <code className="text-xs">pages_manage_posts</code>
                {", plus Instagram permissions if needed"}
              </li>
              <li>
                Redirect URI: paste{" "}
                <code className="text-xs">{facebookRedirectUri}</code> (same URI
                works for Instagram connect)
              </li>
              <li>
                Copy the <strong>Configuration ID</strong> into{" "}
                <code className="text-xs">META_FB_LOGIN_CONFIG_ID</code> in{" "}
                <code className="text-xs">.env</code> and restart the server
              </li>
              <li>
                Set <strong>App Domains</strong> in{" "}
                <a
                  href={metaAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Basic settings
                </a>{" "}
                to <code className="text-xs">{appDomain}</code>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <CopyValue label="App Domains" value={appDomain} />
          <CopyValue label="App base URL" value={appBaseUrl} />
          <CopyValue
            label="Redirect URI (use in Configuration)"
            value={facebookRedirectUri}
          />
          <CopyValue
            label="Instagram callback (same host)"
            value={instagramRedirectUri}
          />
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">
              Configuration ID → META_FB_LOGIN_CONFIG_ID
            </p>
            <div
              className={cn(
                "rounded-md border px-2 py-1.5 text-xs",
                configId
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
              )}
            >
              {configId ?? "Not set — add after creating Configuration in Meta"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
