"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Auction } from "@/lib/types";

type StatusFilter = "all" | Auction["status"];

interface FilterBarProps {
  statusFilter: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categories?: string[];
  categoryFilter?: string;
  onCategoryChange?: (c: string) => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function FilterBar({
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  categories = [],
  categoryFilter = "",
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search auctions..."
          className="pl-8 h-8 text-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 0 && onCategoryChange && (
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={!categoryFilter ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={() => onCategoryChange("")}
          >
            All Categories
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs px-2.5"
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
