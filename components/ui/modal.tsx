"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  dismissable?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
};

export default function Modal({
  open,
  onOpenChange,
  title,
  children,
  dismissable = true,
  size = "md",
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (dismissable && onOpenChange) onOpenChange(false);
        }}
      />
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} rounded-lg border bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto`}
      >
        {title ? (
          <div className="mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}


