"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  endTime: string;
  className?: string;
  showLabel?: boolean;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Ended";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
}

function getUrgencyClass(totalSeconds: number): string {
  if (totalSeconds <= 0) return "text-muted-foreground";
  if (totalSeconds <= 15 * 60) return "text-red-400 font-bold";
  if (totalSeconds <= 60 * 60) return "text-yellow-400 font-semibold";
  return "text-green-400";
}

export function CountdownTimer({
  endTime,
  className,
  showLabel = false,
}: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    try {
      return Math.max(0, differenceInSeconds(parseISO(endTime), new Date()));
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const tick = () => {
      try {
        const diff = differenceInSeconds(parseISO(endTime), new Date());
        setSecondsLeft(Math.max(0, diff));
      } catch {
        setSecondsLeft(0);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <span className={cn(getUrgencyClass(secondsLeft), className)}>
      {showLabel && "Ends in: "}
      {formatCountdown(secondsLeft)}
    </span>
  );
}
