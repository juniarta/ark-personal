"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO, compareAsc } from "date-fns";
import { Gavel, Timer, TrendingUp, Plus, Radio, Package, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AuctionCard } from "@/components/AuctionCard";
import { AuctionForm } from "@/components/AuctionForm";
import { AuctionDetail } from "@/components/AuctionDetail";
import { useAuctionStore } from "@/lib/store";
import { useTimerStore } from "@/lib/store";
import { useTransmitterStore } from "@/lib/store";
import { useInventoryStore } from "@/lib/store";
import { useExpenseStore } from "@/lib/store";
import type { Auction } from "@/lib/types";

function formatMMSS(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { auctions, fetchActiveAuctions } = useAuctionStore();
  const { alarms, fetchAlarms } = useTimerStore();
  const { servers: transmitterServers, fetchServers: fetchTransmitterServers } =
    useTransmitterStore();
  const { categories, items: inventoryItems, fetchCategories, fetchItems } = useInventoryStore();
  const { summary: expenseSummary, fetchProfitLoss } = useExpenseStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchActiveAuctions();
    fetchAlarms();
    fetchTransmitterServers();
    fetchCategories();
    fetchItems();
    fetchProfitLoss();
  }, [fetchActiveAuctions, fetchAlarms, fetchTransmitterServers, fetchCategories, fetchItems, fetchProfitLoss]);

  // Sort active auctions by end_time ascending
  const activeAuctions = auctions
    .filter((a) => a.status === "active")
    .sort((a, b) => {
      try {
        return compareAsc(parseISO(a.end_time), parseISO(b.end_time));
      } catch {
        return 0;
      }
    });

  const upcomingAuctions = activeAuctions.slice(0, 5);
  const activeTimers = alarms.filter((a) => a.is_active);
  const runningTransmitters = transmitterServers.filter((s) => s.is_running);
  const previewTransmitters = runningTransmitters.slice(0, 3);

  const nextEnding = activeAuctions[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Auction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Auction</DialogTitle>
              </DialogHeader>
              <AuctionForm
                onSuccess={() => {
                  setCreateOpen(false);
                  fetchActiveAuctions();
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" asChild>
            <Link href="/timer">
              <Plus className="h-4 w-4 mr-1" />
              New Timer
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Active Auctions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeAuctions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next Ending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextEnding ? (
              <div>
                <p className="text-sm font-semibold truncate">{nextEnding.title}</p>
                <CountdownTimer
                  endTime={nextEnding.end_time}
                  className="text-lg font-mono font-bold"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active auctions</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Active Timers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeTimers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory & Expense Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Inventory summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{inventoryItems.length}</p>
            <p className="text-xs text-muted-foreground mb-2">total items</p>
            {categories.length > 0 && (
              <div className="space-y-1">
                {categories.slice(0, 3).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{cat.icon ?? "📦"}</span>
                      {cat.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {inventoryItems.filter((i) => i.category_id === cat.id).length}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                <Link href="/inventory" className="text-primary hover:underline underline-offset-4">
                  Set up inventory
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expenses P/L summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              In-Game P/L
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseSummary ? (() => {
              const igExpense = expenseSummary.ig_expenses.reduce((s, c) => s + c.total, 0);
              const igIncome = expenseSummary.ig_income.reduce((s, c) => s + c.total, 0);
              const netPL = igIncome - igExpense;
              return (
                <div>
                  <p className={`text-3xl font-bold ${netPL >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {netPL >= 0 ? "+" : ""}{netPL.toLocaleString()}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Income</p>
                      <p className="text-xs font-semibold text-green-500">+{igIncome.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Expenses</p>
                      <p className="text-xs font-semibold text-destructive">-{igExpense.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div>
                <p className="text-3xl font-bold">—</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Link href="/expenses" className="text-primary hover:underline underline-offset-4">
                    Track expenses
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming auctions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Upcoming Auctions</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auctions">View all</Link>
          </Button>
        </div>

        {upcomingAuctions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Gavel className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No active auctions</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCreateOpen(true)}
              >
                Create your first auction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingAuctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onClick={() => {
                  setSelectedAuction(auction);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transmitter Timers Widget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Transmitter Timers
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transmitter">View all</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="py-4">
            {transmitterServers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No servers tracked yet.{" "}
                  <Link href="/transmitter" className="text-primary underline-offset-4 hover:underline">
                    Add a server
                  </Link>{" "}
                  to start tracking transmitter timers.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold">{runningTransmitters.length}</span>
                  <span className="text-sm text-muted-foreground">
                    of {transmitterServers.length} servers running
                  </span>
                </div>
                {previewTransmitters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timers currently running.</p>
                ) : (
                  <div className="space-y-1.5">
                    {previewTransmitters.map((s) => {
                      const elapsed = s.started_at
                        ? Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)
                        : 0;
                      const remaining = Math.max(0, s.timer_duration_s - elapsed);
                      const progress = Math.max(0, Math.min(1, remaining / s.timer_duration_s));
                      const progressColor =
                        progress > 0.5
                          ? "bg-green-500"
                          : progress > 0.2
                          ? "bg-yellow-500"
                          : "bg-red-500";
                      return (
                        <div key={s.id} className="flex items-center gap-3 py-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{s.server_name}</span>
                              <Badge
                                variant={s.is_pvp ? "destructive" : "success"}
                                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                              >
                                {s.is_pvp ? "PvP" : "PvE"}
                              </Badge>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1 mt-1">
                              <div
                                className={`h-full rounded-full ${progressColor}`}
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-mono text-sm font-bold tabular-nums shrink-0">
                            {formatMMSS(remaining)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auction Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auction Details</DialogTitle>
          </DialogHeader>
          {selectedAuction && (
            <AuctionDetail
              auction={selectedAuction}
              onClose={() => {
                setDetailOpen(false);
                fetchActiveAuctions();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
