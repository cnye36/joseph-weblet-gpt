"use client";

import { useState } from "react";
import * as React from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import AccountSettings from "./AccountSettings";
import BillingSettings from "./BillingSettings";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "account" | "billing";
};

type Tab = "account" | "billing";

export default function SettingsModal({ open, onOpenChange, initialTab = "account" }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Update active tab when initialTab changes
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} dismissable={true} size="lg">
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b">
          <button
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "account"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "billing"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Billing
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "account" && <AccountSettings />}
          {activeTab === "billing" && <BillingSettings />}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

