"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Pause, Play, Trash2, Timer, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimerStore } from "@/lib/store";
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

const typeIcon: Record<string, React.ReactNode> = {
  alarm: <Bell className="h-4 w-4" />,
  timer: <Timer className="h-4 w-4" />,
  stopwatch: <span className="text-xs font-bold">SW</span>,
};

export function TimerCard({ alarm }: TimerCardProps) {
  const { pauseTimer, resumeTimer, deleteAlarm } = useTimerStore();
  const [loading, setLoading] = useState(false);

  const handlePause = async () => {
    setLoading(true);
    try {
      await pauseTimer(alarm.id);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await resumeTimer(alarm.id);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${alarm.label}"?`)) return;
    setLoading(true);
    try {
      await deleteAlarm(alarm.id);
      toast.success("Deleted");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

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
                  <span className="font-mono">{formatDuration(alarm.duration_ms)}</span>
                )}
                {alarm.alarm_type === "stopwatch" && (
                  <span className="text-muted-foreground">Stopwatch</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant={alarm.is_active ? "success" : "secondary"} className="text-xs px-1.5 py-0">
              {alarm.is_active ? "Active" : "Paused"}
            </Badge>

            {alarm.alarm_type !== "stopwatch" && (
              alarm.is_active ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePause}
                  disabled={loading}
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleResume}
                  disabled={loading}
                >
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
