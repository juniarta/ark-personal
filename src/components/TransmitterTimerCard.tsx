"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Square, RotateCcw, Trash2, Timer } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTransmitterStore } from "@/lib/store";
import type { TransmitterServer } from "@/lib/types";

interface TransmitterTimerCardProps {
  server: TransmitterServer;
}

function formatMMSS(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatCycleDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}:00 cycle`;
  return `${mins}:${secs.toString().padStart(2, "0")} cycle`;
}

export function TransmitterTimerCard({ server }: TransmitterTimerCardProps) {
  const { startTimer, stopTimer, resetTimer, syncTimer, removeServer } = useTransmitterStore();

  // Client-side countdown state
  const [remaining, setRemaining] = useState<number>(server.timer_duration_s);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncInput, setSyncInput] = useState(""); // "MM:SS" format
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoResetInProgress = useRef(false);

  // Calculate remaining seconds from server state
  const calcRemaining = useCallback(() => {
    if (!server.is_running || !server.started_at) {
      return server.timer_duration_s;
    }
    const elapsed = Math.floor(
      (Date.now() - new Date(server.started_at).getTime()) / 1000
    );
    return Math.max(0, server.timer_duration_s - elapsed);
  }, [server.is_running, server.started_at, server.timer_duration_s]);

  // Handle auto-reset when countdown reaches 0
  const handleAutoReset = useCallback(async () => {
    if (autoResetInProgress.current) return;
    autoResetInProgress.current = true;
    try {
      await resetTimer(server.id);
      toast.success(`${server.server_name} transmitter cycled — timer restarted`);
    } catch (e) {
      toast.error(`Auto-reset failed: ${String(e)}`);
    } finally {
      autoResetInProgress.current = false;
    }
  }, [resetTimer, server.id, server.server_name]);

  // Tick interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set initial value immediately
    setRemaining(calcRemaining());

    if (server.is_running) {
      intervalRef.current = setInterval(() => {
        const r = calcRemaining();
        setRemaining(r);
        if (r <= 0 && !autoResetInProgress.current) {
          handleAutoReset();
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [server.is_running, server.started_at, server.timer_duration_s, calcRemaining, handleAutoReset]);

  const progress = Math.max(0, Math.min(1, remaining / server.timer_duration_s));

  const handleStart = async () => {
    try {
      await startTimer(server.id);
      toast.success(`${server.server_name} timer started`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer(server.id);
      toast.success(`${server.server_name} timer paused`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleReset = async () => {
    try {
      await resetTimer(server.id);
      toast.success(`${server.server_name} timer reset`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleRemove = async () => {
    try {
      await removeServer(server.id);
      toast.success(`${server.server_name} removed`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setConfirmRemoveOpen(false);
    }
  };

  const handleSync = async () => {
    // Parse MM:SS input
    const parts = syncInput.trim().split(":");
    let totalSeconds = 0;
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs)) totalSeconds = mins * 60 + secs;
    } else if (parts.length === 1) {
      // Just minutes
      const mins = parseInt(parts[0], 10);
      if (!isNaN(mins)) totalSeconds = mins * 60;
    }

    if (totalSeconds <= 0 || totalSeconds > server.timer_duration_s) {
      toast.error(`Enter a time between 0:01 and ${formatMMSS(server.timer_duration_s)}`);
      return;
    }

    try {
      await syncTimer(server.id, totalSeconds);
      toast.success(`Synced to ${formatMMSS(totalSeconds)} remaining`);
      setSyncOpen(false);
      setSyncInput("");
    } catch (e) {
      toast.error(String(e));
    }
  };

  // Progress bar color: green → yellow → red
  const progressColor =
    progress > 0.5
      ? "bg-green-500"
      : progress > 0.2
      ? "bg-yellow-500"
      : "bg-red-500";

  const timerColor =
    remaining > server.timer_duration_s * 0.5
      ? "text-green-400"
      : remaining > server.timer_duration_s * 0.2
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{server.server_name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {server.map_name && (
                  <span className="text-xs text-muted-foreground truncate">
                    {server.map_name}
                  </span>
                )}
                <Badge
                  variant={server.is_pvp ? "destructive" : "success"}
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {server.is_pvp ? "PvP" : "PvE"}
                </Badge>
                {!server.is_running && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    Stopped
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmRemoveOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 flex flex-col gap-3">
          {/* Large countdown */}
          <div className="text-center">
            <p
              className={`font-mono text-4xl font-bold tabular-nums tracking-tight ${timerColor}`}
            >
              {formatMMSS(remaining)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCycleDuration(server.timer_duration_s)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {server.is_running ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleStop}
              >
                <Square className="h-3.5 w-3.5 mr-1" />
                Pause
              </Button>
            ) : (
              <Button size="sm" className="flex-1" onClick={handleStart}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSyncInput(""); setSyncOpen(true); }}
              title="Sync to server time"
            >
              <Timer className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              title="Reset to full duration"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Timer Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Sync Timer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter the remaining time you see on the server transmitter:
          </p>
          <Input
            placeholder="MM:SS (e.g. 12:30)"
            value={syncInput}
            onChange={(e) => setSyncInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSync(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSyncOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSync}>
              Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Server</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{server.server_name}</span>{" "}
            from transmitter tracking? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRemoveOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
