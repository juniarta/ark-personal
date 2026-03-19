"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/CountdownTimer";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuctionStore } from "@/lib/store";
import type { Auction } from "@/lib/types";

interface AuctionDetailProps {
  auction: Auction;
  onClose?: () => void;
}

export function AuctionDetail({ auction, onClose }: AuctionDetailProps) {
  const { updateAuction, deleteAuction } = useAuctionStore();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    current_bid: auction.current_bid?.toString() ?? "",
    bid_currency: auction.bid_currency ?? "",
    status: auction.status,
    notes: auction.notes ?? "",
  });

  const setField = (k: keyof typeof editForm, v: string) =>
    setEditForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateAuction(auction.id, {
        current_bid: editForm.current_bid ? parseFloat(editForm.current_bid) : undefined,
        bid_currency: editForm.bid_currency || undefined,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      toast.success("Auction updated");
      setEditing(false);
    } catch (e) {
      toast.error(`Update failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this auction?")) return;
    setLoading(true);
    try {
      await deleteAuction(auction.id);
      toast.success("Auction deleted");
      onClose?.();
    } catch (e) {
      toast.error(`Delete failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), "MMM d, yyyy HH:mm:ss");
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{auction.title}</h2>
          {auction.category && (
            <p className="text-sm text-muted-foreground">{auction.category}</p>
          )}
        </div>
        <StatusBadge status={auction.status} />
      </div>

      {/* Countdown */}
      {auction.status === "active" && (
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
          <CountdownTimer
            endTime={auction.end_time}
            className="text-2xl font-mono font-bold"
          />
        </div>
      )}

      <Separator />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Start: </span>
          {formatDate(auction.start_time)}
        </div>
        <div>
          <span className="text-muted-foreground">End: </span>
          {formatDate(auction.end_time)}
        </div>

        {auction.current_bid !== null && (
          <div>
            <span className="text-muted-foreground">Current Bid: </span>
            <span className="font-semibold">
              {auction.current_bid} {auction.bid_currency ?? ""}
            </span>
          </div>
        )}
        {auction.min_increment !== null && (
          <div>
            <span className="text-muted-foreground">Min Increment: </span>
            {auction.min_increment} {auction.increment_currency ?? auction.bid_currency ?? ""}
          </div>
        )}
        {auction.pickup_server && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Server: </span>
            {auction.pickup_server}
          </div>
        )}
        {auction.source_link && (
          <div className="col-span-2 flex items-center gap-1">
            <span className="text-muted-foreground">Source: </span>
            <span className="truncate text-primary">{auction.source_link}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </div>
        )}
      </div>

      {auction.notes && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{auction.notes}</p>
          </div>
        </>
      )}

      <Separator />

      {/* Edit section */}
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Bid</Label>
              <Input
                type="number"
                value={editForm.current_bid}
                onChange={(e) => setField("current_bid", e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Input
                value={editForm.bid_currency}
                onChange={(e) => setField("bid_currency", e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={editForm.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
