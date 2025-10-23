"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type PremiumBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "subtle";
};

export default function PremiumBadge({
  className,
  size = "md",
  variant = "default",
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const variantClasses = {
    default: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md",
    subtle: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Crown className={iconSizes[size]} />
      Premium
    </span>
  );
}

