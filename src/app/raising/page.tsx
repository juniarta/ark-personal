"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Flame, Zap, Wind, Snowflake, Sparkles, Egg,
  Milk, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_MATURE_SECS_BASE = 333_333.333; // at 1x
const DEFAULT_CUDDLE_INTERVAL_SECS = 28_800; // 8 hours at 1x
const MILK_FOOD_VALUE = 1_200;
const WYVERN_BASE_FOOD = 1_800;
const HATCH_TEMP_MIN = 80;
const HATCH_TEMP_MAX = 90;

// ─── Formulas ────────────────────────────────────────────────────────────────

function foodDrainPerSec(agePct: number, foodConsumptionMult: number): number {
  return Math.max(0, 0.08325 * (1 - agePct / 100) * foodConsumptionMult);
}

function foodDrainPerHour(agePct: number, foodConsumptionMult: number): number {
  return foodDrainPerSec(agePct, foodConsumptionMult) * 3600;
}

function totalMaturationSecs(matureSpeedMult: number): number {
  return TOTAL_MATURE_SECS_BASE / matureSpeedMult;
}

function timeToMatureSecs(agePct: number, matureSpeedMult: number): number {
  return totalMaturationSecs(matureSpeedMult) * (1 - agePct / 100);
}

function timeToStarveSecs(currentFood: number, agePct: number, foodConsumptionMult: number): number {
  const drain = foodDrainPerSec(agePct, foodConsumptionMult);
  if (drain <= 0) return Infinity;
  return currentFood / drain;
}

/** Integrate food drain from agePct to 100% — total milk supply needed */
function totalFoodNeeded(agePct: number, foodConsumptionMult: number, matureSpeedMult: number): number {
  const a = agePct / 100;
  const totalSecs = totalMaturationSecs(matureSpeedMult);
  return 0.08325 * foodConsumptionMult * totalSecs * (0.5 - a + (a * a) / 2);
}

function milkNeeded(agePct: number, foodConsumptionMult: number, matureSpeedMult: number): number {
  return Math.ceil(totalFoodNeeded(agePct, foodConsumptionMult, matureSpeedMult) / MILK_FOOD_VALUE);
}

function cuddleIntervalSecs(matureSpeedMult: number, cuddleIntervalMult: number): number {
  return (DEFAULT_CUDDLE_INTERVAL_SECS * cuddleIntervalMult) / matureSpeedMult;
}

function imprintPerCuddle(
  matureSpeedMult: number,
  cuddleIntervalMult: number,
  imprintAmountMult: number
): number {
  const tmt = totalMaturationSecs(matureSpeedMult);
  const dcit = cuddleIntervalSecs(matureSpeedMult, cuddleIntervalMult);
  const pct = imprintAmountMult / (tmt / dcit - 0.25);
  return Math.min(100, pct * 100);
}

function cuddlesNeededFor100(
  matureSpeedMult: number,
  cuddleIntervalMult: number,
  imprintAmountMult: number
): number {
  const pct = imprintPerCuddle(matureSpeedMult, cuddleIntervalMult, imprintAmountMult);
  return Math.ceil(100 / pct);
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtSecs(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "00:00:00";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (d > 0) return `${d}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type WyvernType = "fire" | "lightning" | "poison" | "ice" | "ash_fire";

interface WyvernEntry {
  id: string;
  name: string;
  wyvernType: WyvernType;
  agePct: number;
  currentFood: number;
  recordedAt: number; // Date.now() when values were recorded
}

interface ServerSettings {
  matureSpeedMult: number;
  cuddleIntervalMult: number;
  imprintAmountMult: number;
  foodConsumptionSpeedMult: number;
}

// ─── Wyvern config ────────────────────────────────────────────────────────────

const WYVERN_CONFIG: Record<WyvernType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  fire:      { label: "Fire",     icon: <Flame    className="h-4 w-4" />, color: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/30"  },
  lightning: { label: "Lightning",icon: <Zap      className="h-4 w-4" />, color: "text-yellow-400", bg: "bg-yellow-500/10",  border: "border-yellow-500/30"  },
  poison:    { label: "Poison",   icon: <Wind     className="h-4 w-4" />, color: "text-green-400",  bg: "bg-green-500/10",   border: "border-green-500/30"   },
  ice:       { label: "Ice",      icon: <Snowflake className="h-4 w-4" />, color: "text-blue-400",  bg: "bg-blue-500/10",    border: "border-blue-500/30"    },
  ash_fire:  { label: "Ash Fire", icon: <Sparkles className="h-4 w-4" />, color: "text-gray-400",   bg: "bg-gray-500/10",    border: "border-gray-500/30"    },
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Live timer hook ──────────────────────────────────────────────────────────

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── Wyvern Card ─────────────────────────────────────────────────────────────

function WyvernCard({
  wyvern,
  settings,
  now,
  onUpdate,
  onDelete,
}: {
  wyvern: WyvernEntry;
  settings: ServerSettings;
  now: number;
  onUpdate: (w: WyvernEntry) => void;
  onDelete: () => void;
}) {
  const [showImprint, setShowImprint] = useState(false);
  const [editFood, setEditFood] = useState(String(wyvern.currentFood));
  const [editAge, setEditAge] = useState(String(wyvern.agePct));

  const cfg = WYVERN_CONFIG[wyvern.wyvernType];
  const elapsedSecs = (now - wyvern.recordedAt) / 1000;

  // Live age (increases as time passes)
  const liveAge = Math.min(
    100,
    wyvern.agePct + (elapsedSecs / totalMaturationSecs(settings.matureSpeedMult)) * 100
  );

  // Live food (decreases as time passes, using recorded age as approximation)
  const liveFood = Math.max(
    0,
    wyvern.currentFood - foodDrainPerSec(wyvern.agePct, settings.foodConsumptionSpeedMult) * elapsedSecs
  );

  const drain = foodDrainPerHour(liveAge, settings.foodConsumptionSpeedMult);
  const secsToStarve = timeToStarveSecs(liveFood, liveAge, settings.foodConsumptionSpeedMult);
  const secsToMature = timeToMatureSecs(liveAge, settings.matureSpeedMult);
  const milk = milkNeeded(liveAge, settings.foodConsumptionSpeedMult, settings.matureSpeedMult);
  const isDone = liveAge >= 100;
  const isUrgent = secsToStarve < 3600 && !isDone;

  // Imprint schedule
  const cuddleSecs = cuddleIntervalSecs(settings.matureSpeedMult, settings.cuddleIntervalMult);
  const imprintPct = imprintPerCuddle(settings.matureSpeedMult, settings.cuddleIntervalMult, settings.imprintAmountMult);
  const totalCuddles = cuddlesNeededFor100(settings.matureSpeedMult, settings.cuddleIntervalMult, settings.imprintAmountMult);
  const estimatedBirthMs = wyvern.recordedAt - (wyvern.agePct / 100) * totalMaturationSecs(settings.matureSpeedMult) * 1000;
  const cuddles = Array.from({ length: totalCuddles }, (_, i) => {
    const time = new Date(estimatedBirthMs + i * cuddleSecs * 1000);
    const agePctAtCuddle = ((i * cuddleSecs) / totalMaturationSecs(settings.matureSpeedMult)) * 100;
    const isPast = time.getTime() < now;
    const isNext = !isPast && (i === 0 || new Date(estimatedBirthMs + (i - 1) * cuddleSecs * 1000).getTime() < now);
    const accumulatedPct = Math.min(100, imprintPct * (i + 1));
    return { i, time, agePctAtCuddle, isPast, isNext, accumulatedPct };
  });
  const nextCuddle = cuddles.find((c) => !c.isPast);

  function handleSyncNow() {
    const age = parseFloat(editAge);
    const food = parseFloat(editFood);
    if (isNaN(age) || isNaN(food)) { toast.error("Invalid age or food value"); return; }
    onUpdate({ ...wyvern, agePct: Math.min(100, Math.max(0, age)), currentFood: Math.max(0, food), recordedAt: Date.now() });
    toast.success("Values synced");
  }

  return (
    <Card className={`border ${cfg.border} ${cfg.bg}`}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cfg.color}>{cfg.icon}</span>
            <span className="font-semibold text-sm">{wyvern.name}</span>
            <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>
              {cfg.label}
            </Badge>
            {isDone && <Badge variant="success" className="text-xs">Adult</Badge>}
            {isUrgent && <Badge variant="destructive" className="text-xs animate-pulse">Feed Soon!</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Maturation" value={`${liveAge.toFixed(2)}%`} sub={isDone ? "Adult" : "growing"} />
          <StatBox
            label="Food left"
            value={Math.max(0, liveFood).toFixed(0)}
            sub={`${drain.toFixed(0)}/hr drain`}
            urgent={isUrgent}
          />
          <StatBox
            label="Feed in"
            value={isDone ? "Adult" : fmtSecs(secsToStarve)}
            sub={isDone ? "—" : secsToStarve < 3600 ? "⚠ Urgent" : "before starve"}
            urgent={isUrgent}
          />
          <StatBox
            label="Time to adult"
            value={isDone ? "Done!" : fmtSecs(secsToMature)}
            sub={isDone ? "🎉" : "remaining"}
          />
        </div>

        {/* Milk & Imprint summary */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Milk className="h-3.5 w-3.5" />
            ~{milk} milk needed
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {imprintPct.toFixed(1)}% per cuddle · {totalCuddles} cuddles for 100%
          </span>
          {nextCuddle && !isDone && (
            <span className="flex items-center gap-1 text-primary">
              Next cuddle: {fmtTime(nextCuddle.time)}
              ({fmtSecs((nextCuddle.time.getTime() - now) / 1000)})
            </span>
          )}
        </div>

        {/* Sync inputs */}
        <div className="flex flex-wrap gap-2 items-end pt-1">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Current Age %</Label>
            <Input
              className="h-7 w-24 text-xs"
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              type="number" min={0} max={100} step={0.01}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Current Food</Label>
            <Input
              className="h-7 w-24 text-xs"
              value={editFood}
              onChange={(e) => setEditFood(e.target.value)}
              type="number" min={0} max={WYVERN_BASE_FOOD}
            />
          </div>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSyncNow}>
            <RefreshCw className="h-3 w-3" /> Sync Now
          </Button>
        </div>

        {/* Imprint schedule toggle */}
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowImprint((v) => !v)}
        >
          {showImprint ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Imprint Schedule ({totalCuddles} cuddles)
        </button>

        {showImprint && (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">#</th>
                  <th className="px-2 py-1 text-left font-medium">Time</th>
                  <th className="px-2 py-1 text-left font-medium">Age%</th>
                  <th className="px-2 py-1 text-left font-medium">Imprint</th>
                  <th className="px-2 py-1 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {cuddles.map((c) => (
                  <tr key={c.i} className={c.isNext ? "bg-primary/10" : c.isPast ? "opacity-40" : ""}>
                    <td className="px-2 py-1">{c.i + 1}</td>
                    <td className="px-2 py-1 font-mono">{c.time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} {c.time.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</td>
                    <td className="px-2 py-1 font-mono">{Math.min(100, c.agePctAtCuddle).toFixed(1)}%</td>
                    <td className="px-2 py-1 font-mono">{Math.min(100, c.accumulatedPct).toFixed(1)}%</td>
                    <td className="px-2 py-1">
                      {c.isPast ? <span className="text-muted-foreground">Done</span> :
                       c.isNext ? <span className="text-primary font-semibold">Next ◀</span> :
                       <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, sub, urgent }: { label: string; value: string; sub: string; urgent?: boolean }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-bold ${urgent ? "text-red-400 animate-pulse" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ─── Add Wyvern Dialog ────────────────────────────────────────────────────────

function AddWyvernForm({ onAdd, onCancel }: { onAdd: (w: WyvernEntry) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [wyvernType, setWyvernType] = useState<WyvernType>("fire");
  const [agePct, setAgePct] = useState(0);
  const [currentFood, setCurrentFood] = useState(1800);

  function handleSubmit() {
    if (!name.trim()) { toast.error("Enter a name"); return; }
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      wyvernType,
      agePct,
      currentFood,
      recordedAt: Date.now(),
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Egg className="h-4 w-4" /> Add Wyvern
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input className="h-8 text-sm" placeholder="e.g. Blaze Jr." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(WYVERN_CONFIG) as WyvernType[]).map((t) => {
                const cfg = WYVERN_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setWyvernType(t)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                      wyvernType === t
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Current Age: {agePct.toFixed(1)}%</Label>
            <Slider value={[agePct]} onValueChange={([v]) => setAgePct(v)} min={0} max={99} step={0.1} className="py-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Current Food (max 1800)</Label>
            <Input className="h-8 text-sm" type="number" min={0} max={1800} value={currentFood}
              onChange={(e) => setCurrentFood(Math.min(1800, Math.max(0, Number(e.target.value))))} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ServerSettings = {
  matureSpeedMult: 1,
  cuddleIntervalMult: 1,
  imprintAmountMult: 1,
  foodConsumptionSpeedMult: 1,
};

export default function RaisingPage() {
  const now = useNow(1000);
  const [settings, setSettings] = useState<ServerSettings>(() =>
    loadStorage("raising:settings", DEFAULT_SETTINGS)
  );
  const [wyverns, setWyverns] = useState<WyvernEntry[]>(() =>
    loadStorage("raising:wyverns", [])
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Persist on change
  useEffect(() => { saveStorage("raising:settings", settings); }, [settings]);
  useEffect(() => { saveStorage("raising:wyverns", wyverns); }, [wyverns]);

  function updateSetting<K extends keyof ServerSettings>(key: K, val: number) {
    setSettings((s) => ({ ...s, [key]: val }));
  }

  function addWyvern(w: WyvernEntry) {
    setWyverns((prev) => [...prev, w]);
    setShowAddForm(false);
    toast.success(`Added ${w.name}`);
  }

  function updateWyvern(updated: WyvernEntry) {
    setWyverns((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }

  function removeWyvern(id: string) {
    setWyverns((prev) => prev.filter((w) => w.id !== id));
    toast.success("Removed");
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Egg className="h-6 w-6 text-primary" /> Wyvern Raising
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track baby wyvern maturation, feeding timers and imprint schedule
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowSettings((v) => !v)} className="gap-1">
          {showSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Server Settings
        </Button>
      </div>

      {/* Server Settings */}
      {showSettings && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Server Multipliers</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { key: "matureSpeedMult",        label: "Mature Speed",     hint: "BabyMatureSpeedMultiplier" },
              { key: "cuddleIntervalMult",      label: "Cuddle Interval",  hint: "BabyCuddleIntervalMultiplier" },
              { key: "imprintAmountMult",       label: "Imprint Amount",   hint: "BabyImprintAmountMultiplier" },
              { key: "foodConsumptionSpeedMult",label: "Food Consumption", hint: "BabyFoodConsumptionSpeedMultiplier" },
            ] as { key: keyof ServerSettings; label: string; hint: string }[]).map(({ key, label, hint }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label} <span className="text-muted-foreground">(×{settings[key].toFixed(1)})</span></Label>
                <Input
                  className="h-8 text-sm"
                  type="number" min={0.1} step={0.1}
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, Math.max(0.1, Number(e.target.value)))}
                />
                <p className="text-xs text-muted-foreground truncate" title={hint}>{hint}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="bg-muted/20 border-muted">
        <CardContent className="p-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-400" /> Hatch: 80–90°C (Egg Incubator)</span>
          <span className="flex items-center gap-1"><Milk className="h-3.5 w-3.5" /> 1 Milk = 1200 food · Spoils 30min inventory</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Feed trough at 10% (juvenile)</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> Wyverns eat ONLY milk (birth → adult)</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Total maturation: {fmtSecs(totalMaturationSecs(settings.matureSpeedMult))}</span>
          <span>Cuddle every: {fmtSecs(cuddleIntervalSecs(settings.matureSpeedMult, settings.cuddleIntervalMult))}</span>
          <span>{cuddlesNeededFor100(settings.matureSpeedMult, settings.cuddleIntervalMult, settings.imprintAmountMult)} cuddles for 100% imprint</span>
        </CardContent>
      </Card>

      {/* Wyvern list */}
      <div className="space-y-4">
        {wyverns.length === 0 && !showAddForm && (
          <div className="text-center py-12 text-muted-foreground">
            <Egg className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No wyverns being tracked.</p>
            <p className="text-xs mt-1">Add a baby wyvern to start tracking.</p>
          </div>
        )}

        {wyverns.map((w) => (
          <WyvernCard
            key={w.id}
            wyvern={w}
            settings={settings}
            now={now}
            onUpdate={updateWyvern}
            onDelete={() => removeWyvern(w.id)}
          />
        ))}

        {showAddForm ? (
          <AddWyvernForm onAdd={addWyvern} onCancel={() => setShowAddForm(false)} />
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" /> Add Wyvern
          </Button>
        )}
      </div>
    </div>
  );
}
