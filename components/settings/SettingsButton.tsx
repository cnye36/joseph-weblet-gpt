"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SettingsModal from "./SettingsModal";
import { Settings } from "lucide-react";

export default function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Settings className="w-4 h-4" />
        Settings
      </Button>
      <SettingsModal open={open} onOpenChange={setOpen} />
    </>
  );
}

