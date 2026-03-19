import { Badge } from "@/components/ui/badge";
import type { Auction } from "@/lib/types";

interface StatusBadgeProps {
  status: Auction["status"];
}

const statusConfig: Record<
  Auction["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }
> = {
  active: { label: "Active", variant: "success" },
  won: { label: "Won", variant: "default" },
  lost: { label: "Lost", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
