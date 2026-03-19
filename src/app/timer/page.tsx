"use client";

import { useEffect, useState, useRef } from "react";
import { format, addMinutes, addHours, addSeconds } from "date-fns";
import { toast } from "sonner";
import { Plus, RotateCcw, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TimerCard } from "@/components/TimerCard";
import { useTimerStore } from "@/lib/store";

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function StopwatchWidget() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const start = () => {
    startRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 100);
    setRunning(true);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    stop();
    setElapsed(0);
  };

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const cs = Math.floor((ms % 1000) / 10);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="py-6 flex flex-col items-center gap-4">
        <p className="font-mono text-4xl font-bold tabular-nums">
          {formatElapsed(elapsed)}
        </p>
        <div className="flex gap-2">
          {!running ? (
            <Button size="sm" onClick={start}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Timer Form ─────────────────────────────────────────────────────────
interface CreateTimerFormProps {
  onSuccess: () => void;
}

function CreateTimerForm({ onSuccess }: CreateTimerFormProps) {
  const { createAlarm } = useTimerStore();
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalMs =
      (parseInt(hours) || 0) * 3_600_000 +
      (parseInt(minutes) || 0) * 60_000 +
      (parseInt(seconds) || 0) * 1_000;

    if (totalMs <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      await createAlarm({
        label: label.trim() || "Timer",
        alarm_type: "timer",
        duration_ms: totalMs,
      });
      toast.success("Timer created");
      onSuccess();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          placeholder="My Timer"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Hours</Label>
          <Input
            type="number"
            min="0"
            max="99"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Minutes</Label>
          <Input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Seconds</Label>
          <Input
            type="number"
            min="0"
            max="59"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Timer"}
      </Button>
    </form>
  );
}

// ── Create Alarm Form ─────────────────────────────────────────────────────────
interface CreateAlarmFormProps {
  onSuccess: () => void;
}

function CreateAlarmForm({ onSuccess }: CreateAlarmFormProps) {
  const { createAlarm } = useTimerStore();
  const [label, setLabel] = useState("");
  const [triggerAt, setTriggerAt] = useState(() =>
    format(addMinutes(new Date(), 30), "yyyy-MM-dd'T'HH:mm")
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerAt) {
      toast.error("Trigger time is required");
      return;
    }

    setLoading(true);
    try {
      await createAlarm({
        label: label.trim() || "Alarm",
        alarm_type: "alarm",
        trigger_at: new Date(triggerAt).toISOString(),
      });
      toast.success("Alarm created");
      onSuccess();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          placeholder="My Alarm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Trigger At</Label>
        <Input
          type="datetime-local"
          value={triggerAt}
          onChange={(e) => setTriggerAt(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Alarm"}
      </Button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TimerPage() {
  const { alarms, fetchAlarms } = useTimerStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTab, setCreateTab] = useState("timer");

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const timers = alarms.filter((a) => a.alarm_type === "timer");
  const alarmsList = alarms.filter((a) => a.alarm_type === "alarm");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timer & Alarm</h1>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Stopwatch */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Stopwatch
        </h2>
        <StopwatchWidget />
      </div>

      <Separator />

      {/* Timers */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Timers ({timers.length})
        </h2>
        {timers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No timers yet.</p>
        ) : (
          <div className="space-y-2">
            {timers.map((alarm) => (
              <TimerCard key={alarm.id} alarm={alarm} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Alarms */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Alarms ({alarmsList.length})
        </h2>
        {alarmsList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No alarms yet.</p>
        ) : (
          <div className="space-y-2">
            {alarmsList.map((alarm) => (
              <TimerCard key={alarm.id} alarm={alarm} />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Timer or Alarm</DialogTitle>
          </DialogHeader>
          <Tabs value={createTab} onValueChange={setCreateTab}>
            <TabsList className="w-full">
              <TabsTrigger value="timer" className="flex-1">Timer</TabsTrigger>
              <TabsTrigger value="alarm" className="flex-1">Alarm</TabsTrigger>
            </TabsList>
            <TabsContent value="timer" className="pt-3">
              <CreateTimerForm
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchAlarms();
                }}
              />
            </TabsContent>
            <TabsContent value="alarm" className="pt-3">
              <CreateAlarmForm
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchAlarms();
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
