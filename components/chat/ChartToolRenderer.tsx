"use client";

import React, { useState } from "react";
import { ChartToolConfig } from "@/lib/chart-schemas";
import { RechartsRenderer } from "./RechartsRenderer";
import { MermaidRenderer } from "./MermaidRenderer";
import { Maximize2 } from "lucide-react";
import { ChartModal } from "./ChartModal";

interface ChartToolRendererProps {
  config: ChartToolConfig;
}

export function ChartToolRendererComponent({ config }: ChartToolRendererProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isQuantitative = ["line", "bar", "pie", "area"].includes(config.type);
  const isDiagram = ["flowchart", "gantt"].includes(config.type);

  return (
    <>
      <div className="relative group w-full max-w-2xl mx-auto my-4 p-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 bg-background/80 hover:bg-background border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="Enlarge Chart"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full overflow-hidden">
          {isQuantitative && (
            <div className="h-[400px] w-full">
              <RechartsRenderer config={config} />
            </div>
          )}
          {isDiagram && <MermaidRenderer config={config} />}
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
      />
    </>
  );
}

export const ChartToolRenderer = React.memo(ChartToolRendererComponent);
