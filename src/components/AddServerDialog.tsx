"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, ServerIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTransmitterStore } from "@/lib/store";
import type { ArkOfficialServer } from "@/lib/types";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

export function AddServerDialog({
  open,
  onOpenChange,
  onAdded,
}: AddServerDialogProps) {
  const { fetchOfficialServers, officialServers, addServer } =
    useTransmitterStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfficial, setSelectedOfficial] =
    useState<ArkOfficialServer | null>(null);
  const [serverName, setServerName] = useState("");
  const [timerMinutes, setTimerMinutes] = useState("15");
  const [fetchingServers, setFetchingServers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch official servers when dialog opens
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    setFetchingServers(true);
    fetchOfficialServers()
      .catch(() => {
        // silently fail — user can still add manually
      })
      .finally(() => setFetchingServers(false));
  }, [open, fetchOfficialServers]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedOfficial(null);
      setServerName("");
      setTimerMinutes("15");
    }
  }, [open]);

  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) return officialServers.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return officialServers
      .filter(
        (s) =>
          s.session_name.toLowerCase().includes(q) ||
          s.map_name.toLowerCase().includes(q) ||
          s.cluster_id.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [officialServers, searchQuery]);

  const handleSelectOfficial = (s: ArkOfficialServer) => {
    setSelectedOfficial(s);
    setServerName(s.session_name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = serverName.trim();
    if (!name) {
      toast.error("Server name is required");
      return;
    }
    const mins = parseInt(timerMinutes) || 15;
    if (mins <= 0) {
      toast.error("Timer duration must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      await addServer({
        server_name: name,
        server_id: selectedOfficial?.session_id,
        map_name: selectedOfficial?.map_name,
        cluster_id: selectedOfficial?.cluster_id,
        is_pvp: selectedOfficial?.is_pvp ?? false,
        timer_duration_s: mins * 60,
      });
      toast.success(`${name} added to transmitter tracking`);
      onOpenChange(false);
      onAdded?.();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Add Transmitter Server</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden px-6 pb-6">
          {/* Search official servers */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Search Official ARK Servers
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, map, cluster…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Server list */}
            <div className="border rounded-md overflow-y-auto max-h-48 bg-background">
              {fetchingServers ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading servers…
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-1 text-muted-foreground">
                  <ServerIcon className="h-5 w-5" />
                  <p className="text-sm">
                    {officialServers.length === 0
                      ? "Could not load official server list"
                      : "No servers match your search"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredServers.map((s) => {
                    const isSelected =
                      selectedOfficial?.session_id === s.session_id;
                    return (
                      <button
                        key={s.session_id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent ${
                          isSelected ? "bg-primary/10 text-primary" : ""
                        }`}
                        onClick={() => handleSelectOfficial(s)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {s.session_name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {s.num_players}/{s.max_players}
                            </span>
                            <Badge
                              variant={s.is_pvp ? "destructive" : "success"}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {s.is_pvp ? "PvP" : "PvE"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.map_name}
                          {s.cluster_id ? ` · ${s.cluster_id}` : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Manual / confirmation form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Server Name</Label>
              <Input
                placeholder="e.g. Official-NA-PVP-TheIsland123"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
              />
              {!selectedOfficial && (
                <p className="text-xs text-muted-foreground">
                  Select a server above or type a name manually.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Timer Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                max="120"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Default: 15 minutes. The timer auto-loops when it reaches 0.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Adding…
                  </>
                ) : (
                  "Add Server"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
