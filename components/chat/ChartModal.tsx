"use client";

import { useEffect, useState, useRef } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartToolConfig } from "@/lib/chart-schemas";
import { RechartsRenderer } from "./RechartsRenderer";
import { MermaidRenderer } from "./MermaidRenderer";

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: ChartToolConfig;
  children?: React.ReactNode;
  title?: string;
  onDownload?: () => void;
}

export function ChartModal({
  isOpen,
  onClose,
  config,
  children,
  title,
  onDownload,
}: ChartModalProps) {
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (!contentRef.current) return;

    const svg = contentRef.current.querySelector("svg");
    if (svg) {
      // Clone the SVG to avoid modifying the DOM
      const clonedSvg = svg.cloneNode(true) as SVGElement;
      
      // Ensure XML namespace exists
      if (!clonedSvg.getAttribute("xmlns")) {
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${config?.title || title || "chart"}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (!mounted || !isOpen) return null;

  const isQuantitative = config && ["line", "bar", "pie", "area"].includes(config.type);
  const isDiagram = config && ["flowchart", "gantt"].includes(config.type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-lg shadow-xl max-w-5xl w-full mx-4 h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">{config?.title || title || "Chart"}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {onDownload ? "Download CSV" : "Download SVG"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden bg-card" ref={contentRef}>
          <div className="w-full h-full flex items-center justify-center overflow-auto">
             {config ? (
               <>
                 {isQuantitative && <RechartsRenderer config={config} />}
                 {isDiagram && <MermaidRenderer config={config} />}
               </>
             ) : (
               children
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
