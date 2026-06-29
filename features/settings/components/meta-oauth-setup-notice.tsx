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
  basicSettingsUrl: string
  appUrlMisconfigured?: boolean
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
  basicSettingsUrl,
  appUrlMisconfigured = false,
}: MetaOAuthSetupNoticeProps) {
  const usesHttps = appBaseUrl.startsWith("https://")

  return (
    <Card className="border-amber-500/25 bg-amber-500/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Facebook connection setup</CardTitle>
        <CardDescription>
          Fix the &quot;domain not included&quot; error by matching Meta{" "}
          <strong className="text-foreground">App Domains</strong> and{" "}
          <strong className="text-foreground">Configuration redirect URI</strong>{" "}
          to the values below exactly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appUrlMisconfigured ? (
          <Alert variant="destructive">
            <AlertTitle className="text-sm">Vercel URL misconfiguration</AlertTitle>
            <AlertDescription className="text-sm">
              Set{" "}
              <code className="text-xs">NEXT_PUBLIC_APP_URL=https://aisocialmediaassistant.vercel.app</code>{" "}
              in Vercel env vars and redeploy. The app auto-detects Vercel, but
              Meta must still list the same domain.
            </AlertDescription>
          </Alert>
        ) : null}

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

        <Alert variant="destructive">
          <AlertTitle className="text-sm">
            Error: &quot;Domeniul acestui URL nu este inclus...&quot;
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>Meta blocks the redirect because these three values do not match:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                <a
                  href={basicSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Basic settings → App Domains
                </a>
                : must be exactly{" "}
                <code className="text-xs">{appDomain}</code> (no https://)
              </li>
              <li>
                <a
                  href={configurationsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Configurations → Redirect URI
                </a>
                : must be exactly{" "}
                <code className="text-xs">{facebookRedirectUri}</code>
              </li>
              <li>
                Vercel <code className="text-xs">NEXT_PUBLIC_APP_URL</code> and{" "}
                <code className="text-xs">META_FB_LOGIN_CONFIG_ID</code> set, then
                redeploy
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertTitle className="text-sm">Meta setup steps (Facebook only)</AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Open{" "}
                <a
                  href={basicSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  App settings → Basic
                  <ExternalLink className="size-3" />
                </a>{" "}
                — set <strong>App Domains</strong> to{" "}
                <code className="text-xs">{appDomain}</code> (remove{" "}
                <code className="text-xs">localhost</code> if still there)
              </li>
              <li>
                Open{" "}
                <a
                  href={configurationsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  Configurations
                  <ExternalLink className="size-3" />
                </a>{" "}
                — create config: User token, Page permissions, redirect URI above
              </li>
              <li>
                Copy <strong>Configuration ID</strong> → Vercel env{" "}
                <code className="text-xs">META_FB_LOGIN_CONFIG_ID</code>
              </li>
              <li>App mode: <strong>Development</strong>, you as Admin</li>
              <li>Save Meta, redeploy Vercel, wait 1 minute, try Connect</li>
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
