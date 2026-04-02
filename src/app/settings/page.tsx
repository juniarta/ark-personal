"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Sword,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { checkForUpdate, type UpdateInfo } from "@/lib/tauri";

export default function SettingsPage() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function handleCheckUpdate() {
    setChecking(true);
    setUpdateInfo(null);
    setUpdateError(null);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
      if (info.has_update) {
        toast.success(`Update available: v${info.latest_version}`);
      } else {
        toast.success("You are on the latest version.");
      }
    } catch (err) {
      const msg = String(err);
      setUpdateError(msg);
      toast.error("Failed to check for updates.");
    } finally {
      setChecking(false);
    }
  }

  async function openDownloadPage(url: string) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Update section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Check for Updates</p>
              <p className="text-xs text-muted-foreground">
                Fetch the latest release from GitHub
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCheckUpdate}
              disabled={checking}
            >
              {checking && (
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
              )}
              {checking ? "Checking..." : "Check Now"}
            </Button>
          </div>

          {updateError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          {updateInfo && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current version</span>
                <span className="font-mono">v{updateInfo.current_version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latest version</span>
                <span className="font-mono">v{updateInfo.latest_version}</span>
              </div>

              {updateInfo.has_update ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-green-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Update available!
                  </div>
                  {updateInfo.release_notes && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {updateInfo.release_notes}
                    </p>
                  )}
                  {updateInfo.download_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => openDownloadPage(updateInfo.download_url)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Download on GitHub
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  You are up to date.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center text-2xl">
              <Sword className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Ark Personal Tools</p>
              <p className="text-sm text-muted-foreground">
                Personal utility for ASA trading &amp; auctions
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">v0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span>Windows (Tauri v2)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frontend</span>
              <span>Next.js 15 + React 19</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backend</span>
              <span>Rust + SQLite</span>
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground leading-relaxed">
            Ark Personal Tools is a personal desktop application for tracking
            ASA in-game auctions, timers, inventory, and expenses. Built with
            Tauri + Next.js.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
