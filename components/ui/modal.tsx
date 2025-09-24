"use client";

import * as React from "react";

type ModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  dismissable?: boolean;
};

export default function Modal({ open, onOpenChange, title, children, dismissable = true }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (dismissable && onOpenChange) onOpenChange(false);
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-5 shadow-lg">
        {title ? (
          <div className="mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );
}


