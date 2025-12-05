import React from "react";
import { Badge } from "./badge";
import type { ReputationBadge } from "@/lib/api";

interface ReputationBadgeProps {
  badge: ReputationBadge;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function ReputationBadgeComponent({
  badge,
  size = "md",
  showIcon = true,
}: ReputationBadgeProps) {
  const getVariant = () => {
    switch (badge.level) {
      case "excellent":
      case "kyc":
      case "on_chain":
        return "default";
      case "good":
      case "verified":
      case "safe":
        return "secondary";
      case "fresh":
        return "outline";
      default:
        return "outline";
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs px-2 py-0.5";
      case "lg":
        return "text-base px-4 py-2";
      default:
        return "text-sm px-3 py-1";
    }
  };

  return (
    <Badge variant={getVariant()} className={getSizeClass()}>
      {showIcon && badge.icon && (
        <span className="mr-1.5">{badge.icon}</span>
      )}
      {badge.label}
    </Badge>
  );
}

