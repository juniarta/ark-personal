"use client";

import { useEffect, useState } from "react";
import { Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransmitterTimerCard } from "@/components/TransmitterTimerCard";
import { AddServerDialog } from "@/components/AddServerDialog";
import { useTransmitterStore } from "@/lib/store";

export default function TransmitterPage() {
  const { servers, fetchServers } = useTransmitterStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchServers();
    }
  }, [fetchServers]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Transmitter Timers</h1>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Server
        </Button>
      </div>

      {/* Server grid */}
      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Radio className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-xs">
            No servers tracked. Add a server to start tracking transmitter timers.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add your first server
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {servers.map((server) => (
            <TransmitterTimerCard key={server.id} server={server} />
          ))}
        </div>
      )}

      <AddServerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={() => fetchServers()}
      />
    </div>
  );
}
