"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuctionCard } from "@/components/AuctionCard";
import { AuctionForm } from "@/components/AuctionForm";
import { AuctionDetail } from "@/components/AuctionDetail";
import { FilterBar } from "@/components/FilterBar";
import { useAuctionStore } from "@/lib/store";
import type { Auction } from "@/lib/types";
import { compareAsc, parseISO } from "date-fns";

type StatusFilter = "all" | Auction["status"];

export default function AuctionsPage() {
  const { auctions, fetchActiveAuctions, fetchAuctionsByStatus } = useAuctionStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (statusFilter === "all") {
      fetchActiveAuctions();
    } else {
      fetchAuctionsByStatus(statusFilter);
    }
  }, [statusFilter, fetchActiveAuctions, fetchAuctionsByStatus]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    auctions.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats).sort();
  }, [auctions]);

  // Filter + sort
  const filteredAuctions = useMemo(() => {
    let list = [...auctions];

    if (categoryFilter) {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.pickup_server?.toLowerCase().includes(q)
      );
    }

    // Sort: active first by end time, then rest
    list.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      try {
        return compareAsc(parseISO(a.end_time), parseISO(b.end_time));
      } catch {
        return 0;
      }
    });

    return list;
  }, [auctions, categoryFilter, searchQuery]);

  const handleStatusChange = (s: StatusFilter) => {
    setStatusFilter(s);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auctions</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAuctions.length} auction{filteredAuctions.length !== 1 ? "s" : ""}
          </p>
        </div>

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
                if (statusFilter === "all") {
                  fetchActiveAuctions();
                } else {
                  fetchAuctionsByStatus(statusFilter);
                }
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <FilterBar
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {/* Auction grid */}
      {filteredAuctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">No auctions found.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setCreateOpen(true)}
          >
            Create an auction
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAuctions.map((auction) => (
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

      {/* Auction detail dialog */}
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
                setSelectedAuction(null);
                if (statusFilter === "all") {
                  fetchActiveAuctions();
                } else {
                  fetchAuctionsByStatus(statusFilter);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
