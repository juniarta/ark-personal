"use client";

import { useState, useCallback } from "react";
import { format, addHours, parseISO } from "date-fns";
import { toast } from "sonner";
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
import { parseSourceLink, parseAuctionText } from "@/lib/tauri";
import { useAuctionStore } from "@/lib/store";
import type { CreateAuctionPayload } from "@/lib/types";

interface AuctionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

function toLocalDatetimeInput(isoStr: string): string {
  try {
    const d = parseISO(isoStr);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return isoStr;
  }
}

function fromLocalDatetimeInput(localStr: string): string {
  if (!localStr) return "";
  try {
    // Treat as local time, convert to ISO
    const d = new Date(localStr);
    return d.toISOString();
  } catch {
    return localStr;
  }
}

export function AuctionForm({ onSuccess, onCancel }: AuctionFormProps) {
  const { createAuction } = useAuctionStore();
  const [loading, setLoading] = useState(false);
  const [parsingLink, setParsingLink] = useState(false);
  const [parsingText, setParsingText] = useState(false);
  const [timeConflict, setTimeConflict] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    source_link: "",
    source_type: "",
    duration_type: "24h",
    start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(addHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm"),
    current_bid: "",
    bid_currency: "Meow",
    min_increment: "",
    increment_currency: "",
    pickup_server: "",
    notes: "",
    raw_post_text: "",
  });

  // Parsed times from different sources for conflict detection
  const [linkTime, setLinkTime] = useState<string | null>(null);

  const setField = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSourceLinkBlur = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      setParsingLink(true);
      try {
        const meta = await parseSourceLink(url);
        if (meta.error) {
          toast.error(`Link parse error: ${meta.error}`);
          return;
        }
        if (meta.post_timestamp) {
          const startIso = meta.post_timestamp;
          const startLocal = toLocalDatetimeInput(startIso);
          setLinkTime(startIso);
          setField("start_time", startLocal);
          toast.success("Extracted start time from link");

          // If we already have a parsed text time, check for conflict
          if (form.start_time) {
            const existingIso = fromLocalDatetimeInput(form.start_time);
            const diffMs = Math.abs(
              new Date(startIso).getTime() - new Date(existingIso).getTime()
            );
            if (diffMs > 10 * 60 * 1000) {
              setTimeConflict(
                `Warning: Link time (${format(parseISO(startIso), "HH:mm")}) differs from text-parsed time by more than 10 minutes`
              );
            }
          }
        }
        if (meta.platform) {
          setField("source_type", meta.platform.toLowerCase());
        }
      } catch (e) {
        toast.error(`Failed to parse link: ${String(e)}`);
      } finally {
        setParsingLink(false);
      }
    },
    [form.start_time]
  );

  const handleTextPaste = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 20) return;
    setParsingText(true);
    try {
      const parsed = await parseAuctionText(text);

      if (parsed.title) setField("title", parsed.title);
      if (parsed.bid_amount !== null) setField("current_bid", String(parsed.bid_amount));
      if (parsed.bid_currency) setField("bid_currency", parsed.bid_currency);
      if (parsed.min_increment !== null) setField("min_increment", String(parsed.min_increment));
      if (parsed.increment_currency) setField("increment_currency", parsed.increment_currency);
      if (parsed.pickup_server) setField("pickup_server", parsed.pickup_server);

      if (parsed.start_time) {
        const startLocal = toLocalDatetimeInput(parsed.start_time);
        setField("start_time", startLocal);

        // Check conflict with link time
        if (linkTime) {
          const diffMs = Math.abs(
            new Date(parsed.start_time).getTime() - new Date(linkTime).getTime()
          );
          if (diffMs > 10 * 60 * 1000) {
            setTimeConflict(
              `Warning: Text-parsed time (${format(parseISO(parsed.start_time), "HH:mm")}) differs from link time by more than 10 minutes`
            );
          } else {
            setTimeConflict(null);
          }
        }
      }
      if (parsed.end_time) {
        setField("end_time", toLocalDatetimeInput(parsed.end_time));
      } else if (parsed.start_time && parsed.duration_hours) {
        const endIso = addHours(parseISO(parsed.start_time), parsed.duration_hours).toISOString();
        setField("end_time", toLocalDatetimeInput(endIso));
      }

      toast.success("Auto-filled fields from post text");
    } catch (e) {
      // Silent fail for parsing — user may have pasted partial text
    } finally {
      setParsingText(false);
    }
  }, [linkTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.end_time) {
      toast.error("End time is required");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateAuctionPayload = {
        title: form.title.trim(),
        start_time: fromLocalDatetimeInput(form.start_time),
        end_time: fromLocalDatetimeInput(form.end_time),
      };

      if (form.category.trim()) payload.category = form.category.trim();
      if (form.source_link.trim()) payload.source_link = form.source_link.trim();
      if (form.source_type.trim()) payload.source_type = form.source_type.trim();
      if (form.duration_type.trim()) payload.duration_type = form.duration_type.trim();
      if (form.current_bid.trim()) payload.current_bid = parseFloat(form.current_bid);
      if (form.bid_currency.trim()) payload.bid_currency = form.bid_currency.trim();
      if (form.min_increment.trim()) payload.min_increment = parseFloat(form.min_increment);
      if (form.increment_currency.trim()) payload.increment_currency = form.increment_currency.trim();
      if (form.pickup_server.trim()) payload.pickup_server = form.pickup_server.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.raw_post_text.trim()) payload.raw_post_text = form.raw_post_text.trim();

      await createAuction(payload);
      toast.success("Auction created!");
      onSuccess?.();
    } catch (e) {
      toast.error(`Failed to create auction: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Source Link */}
      <div className="space-y-1.5">
        <Label>Source Link (Discord/Facebook)</Label>
        <Input
          placeholder="https://discord.com/channels/..."
          value={form.source_link}
          onChange={(e) => setField("source_link", e.target.value)}
          onBlur={(e) => handleSourceLinkBlur(e.target.value)}
          disabled={parsingLink}
        />
        {parsingLink && <p className="text-xs text-muted-foreground">Parsing link...</p>}
      </div>

      {/* Post Text */}
      <div className="space-y-1.5">
        <Label>Post Text (paste for auto-fill)</Label>
        <Textarea
          placeholder="Paste auction post text here..."
          value={form.raw_post_text}
          rows={3}
          onChange={(e) => setField("raw_post_text", e.target.value)}
          onBlur={(e) => handleTextPaste(e.target.value)}
          disabled={parsingText}
        />
        {parsingText && <p className="text-xs text-muted-foreground">Parsing text...</p>}
      </div>

      {/* Time conflict warning */}
      {timeConflict && (
        <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2">
          <p className="text-xs text-yellow-400">{timeConflict}</p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input
          placeholder="e.g. Giganotosaurus Tek Saddle"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          required
        />
      </div>

      {/* Category & Server row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input
            placeholder="e.g. Saddles"
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pickup Server</Label>
          <Input
            placeholder="e.g. NA-PVE-Official-TheIsland"
            value={form.pickup_server}
            onChange={(e) => setField("pickup_server", e.target.value)}
          />
        </div>
      </div>

      {/* Start / End time row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start Time</Label>
          <Input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setField("start_time", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>End Time *</Label>
          <Input
            type="datetime-local"
            value={form.end_time}
            onChange={(e) => setField("end_time", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Bid row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Current Bid</Label>
          <Input
            type="number"
            placeholder="0"
            value={form.current_bid}
            onChange={(e) => setField("current_bid", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Input
            placeholder="Meow / Diamonds"
            value={form.bid_currency}
            onChange={(e) => setField("bid_currency", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Min Increment</Label>
          <Input
            type="number"
            placeholder="0"
            value={form.min_increment}
            onChange={(e) => setField("min_increment", e.target.value)}
          />
        </div>
      </div>

      {/* Duration type */}
      <div className="space-y-1.5">
        <Label>Duration Type</Label>
        <Select value={form.duration_type} onValueChange={(v) => setField("duration_type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="6h">6 hours</SelectItem>
            <SelectItem value="12h">12 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="48h">48 hours</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes..."
          value={form.notes}
          rows={2}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || parsingLink || parsingText}>
          {loading ? "Creating..." : "Create Auction"}
        </Button>
      </div>
    </form>
  );
}
