"use client";

import { ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { StatusBadge } from "@/components/StatusBadge";
import type { Auction } from "@/lib/types";

interface AuctionCardProps {
  auction: Auction;
  onClick?: () => void;
}

export function AuctionCard({ auction, onClick }: AuctionCardProps) {
  const endDate = (() => {
    try {
      return format(parseISO(auction.end_time), "MMM d, yyyy HH:mm");
    } catch {
      return auction.end_time;
    }
  })();

  const sourceIcon = auction.source_type === "discord" ? "💬" : auction.source_type === "facebook" ? "📘" : "🔗";

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors bg-card/80"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">
              {auction.title}
            </h3>
            {auction.category && (
              <p className="text-xs text-muted-foreground mt-0.5">{auction.category}</p>
            )}
          </div>
          <StatusBadge status={auction.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Countdown */}
        {auction.status === "active" && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Ends:</span>
            <CountdownTimer endTime={auction.end_time} className="font-mono text-xs" />
          </div>
        )}

        {/* End time */}
        <p className="text-xs text-muted-foreground">{endDate}</p>

        {/* Bid info */}
        {(auction.current_bid !== null || auction.min_increment !== null) && (
          <div className="flex gap-3 text-xs">
            {auction.current_bid !== null && (
              <span className="text-foreground/80">
                Bid: <span className="font-semibold">{auction.current_bid} {auction.bid_currency ?? ""}</span>
              </span>
            )}
            {auction.min_increment !== null && (
              <span className="text-muted-foreground">
                +{auction.min_increment} {auction.increment_currency ?? auction.bid_currency ?? ""}
              </span>
            )}
          </div>
        )}

        {/* Server + source link */}
        <div className="flex items-center justify-between">
          {auction.pickup_server && (
            <span className="text-xs text-muted-foreground truncate">
              {auction.pickup_server}
            </span>
          )}
          {auction.source_link && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                // In Tauri we'd open external URL; for now just noop
              }}
            >
              {sourceIcon} <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
