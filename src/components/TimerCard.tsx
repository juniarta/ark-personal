"use client";

import React, { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Pause, Play, Trash2, Timer, Bell, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimerStore } from "@/lib/store";
import { notifyTimerDone } from "@/lib/tauri";
import type { Alarm } from "@/lib/types";

interface TimerCardProps {
  alarm: Alarm;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function AlarmCountdown({ triggerAt }: { triggerAt: string }) {
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, parseISO(triggerAt).getTime() - Date.now())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(Math.max(0, parseISO(triggerAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [triggerAt]);

  return (
    <span className={msLeft <= 5 * 60 * 1000 ? "text-red-400 font-mono font-bold" : "font-mono"}>
      {formatDuration(msLeft)}
    </span>
  );
}

function TimerCountdown({
  durationMs,
  startedAt,
  isActive,
  label,
  onDone,
}: {
  durationMs: number;
  startedAt: string | null;
  isActive: boolean;
  label: string;
  onDone: () => void;
}) {
  const calcRemaining = () => {
    if (isActive && startedAt) {
      const elapsed = Date.now() - parseISO(startedAt).getTime();
      return Math.max(0, durationMs - elapsed);
    }
    return Math.max(0, durationMs);
  };

  const [msLeft, setMsLeft] = useState(calcRemaining);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    setMsLeft(calcRemaining());
    if (!isActive || !startedAt) return;

    const id = setInterval(() => {
      const remaining = calcRemaining();
      setMsLeft(remaining);

      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        notifyTimerDone(label).catch(() => {});
        toast.success(`⏰ Timer done: ${label}`, { duration: 8000 });
        onDone();
      }
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, startedAt, isActive]);

  // "done" = timer was running and hit 0 (duration_ms === 0 in DB means done)
  const isDone = durationMs === 0 && !isActive;
  const urgent = msLeft <= 5 * 60 * 1000 && msLeft > 0;

  return (
    <span className={
      isDone
        ? "text-orange-400 font-mono font-bold animate-pulse"
        : urgent
        ? "text-red-400 font-mono font-bold"
        : "font-mono"
    }>
      {isDone ? "00:00" : formatDuration(msLeft)}
    </span>
  );
}

const typeIcon: Record<string, React.ReactNode> = {
  alarm: <Bell className="h-4 w-4" />,
  timer: <Timer className="h-4 w-4" />,
  stopwatch: <span className="text-xs font-bold">SW</span>,
};

// Derive 3-state status from alarm fields
function timerStatus(alarm: Alarm): "active" | "paused" | "done" {
  if (alarm.alarm_type !== "timer") return alarm.is_active ? "active" : "paused";
  if (alarm.is_active) return "active";
  if (alarm.duration_ms === 0) return "done";
  return "paused";
}

export function TimerCard({ alarm }: TimerCardProps) {
  const { pauseTimer, resumeTimer, deleteAlarm, markTimerDone, replayTimer } = useTimerStore();
  const [loading, setLoading] = useState(false);

  const status = timerStatus(alarm);

  const handlePause = async () => {
    setLoading(true);
    try { await pauseTimer(alarm.id); }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  const handleResume = async () => {
    setLoading(true);
    try { await resumeTimer(alarm.id); }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  const handleReplay = async () => {
    setLoading(true);
    try {
      await replayTimer(alarm.id);
      toast.success(`▶ Replaying: ${alarm.label}`);
    }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  const handleDone = async () => {
    try { await markTimerDone(alarm.id); }
    catch { /* best-effort */ }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${alarm.label}"?`)) return;
    setLoading(true);
    try {
      await deleteAlarm(alarm.id);
      toast.success("Deleted");
    }
    catch (e) { toast.error(String(e)); }
    finally { setLoading(false); }
  };

  const badgeVariant =
    status === "active" ? "success" :
    status === "done"   ? "destructive" :
    "secondary";

  const badgeLabel =
    status === "active" ? "Active" :
    status === "done"   ? "Done" :
    "Paused";

  return (
    <Card className="bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-muted-foreground">
              {typeIcon[alarm.alarm_type] ?? <Timer className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{alarm.label}</p>
              <div className="text-xs text-muted-foreground">
                {alarm.alarm_type === "alarm" && alarm.trigger_at && (
                  <span>
                    {format(parseISO(alarm.trigger_at), "HH:mm")} &middot;{" "}
                    <AlarmCountdown triggerAt={alarm.trigger_at} />
                  </span>
                )}
                {alarm.alarm_type === "timer" && alarm.duration_ms !== null && (
                  <TimerCountdown
                    durationMs={alarm.duration_ms}
                    startedAt={alarm.started_at}
                    isActive={alarm.is_active}
                    label={alarm.label}
                    onDone={handleDone}
                  />
                )}
                {alarm.alarm_type === "stopwatch" && (
                  <span className="text-muted-foreground">Stopwatch</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant={badgeVariant} className="text-xs px-1.5 py-0">
              {badgeLabel}
            </Badge>

            {alarm.alarm_type === "timer" && (
              <>
                {status === "active" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePause} disabled={loading}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                )}
                {status === "paused" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResume} disabled={loading}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {status === "done" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={handleReplay} disabled={loading} title="Replay timer">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}

            {alarm.alarm_type === "alarm" && (
              alarm.is_active ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePause} disabled={loading}>
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResume} disabled={loading}>
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
