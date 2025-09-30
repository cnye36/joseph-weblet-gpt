"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Expand, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartModal from "./ChartModal";

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export default function MermaidChart({ chart, className = "" }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartTitle, setChartTitle] = useState("Mermaid Chart");

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;
      
      // Validate chart content
      if (!chart || chart.trim().length === 0) {
        setError("Empty chart content provided");
        return;
      }
      
      try {
        // Clean up the chart content - remove extra whitespace and ensure proper formatting
        const cleanChart = chart.trim();
        
        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "inherit",
          logLevel: "error",
          themeVariables: {
            primaryColor: "#6366f1",
            primaryTextColor: "#fff",
            primaryBorderColor: "#4f46e5",
            lineColor: "#6366f1",
            secondaryColor: "#8b5cf6",
            tertiaryColor: "#ec4899",
            background: "#ffffff",
            mainBkg: "#f3f4f6",
            secondBkg: "#e5e7eb",
            textColor: "#1f2937",
            border1: "#d1d5db",
            border2: "#9ca3af",
          },
        });

        // Generate unique ID for this chart
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the chart
        const { svg } = await mermaid.render(id, cleanChart);
        setSvgContent(svg);
        setError(null);
        
        // Extract title from chart if available
        const titleMatch = cleanChart.match(/title\s+(.+)/);
        if (titleMatch) {
          setChartTitle(titleMatch[1].trim());
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render chart");
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4 my-2">
        <p className="text-sm text-destructive font-medium">Chart rendering error:</p>
        <pre className="text-xs text-destructive/80 mt-2 overflow-x-auto">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
            Show chart code
          </summary>
          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">{chart}</pre>
        </details>
      </div>
    );
  }

  const downloadChart = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chartTitle.replace(/\s+/g, "-").toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="relative group my-4">
        <div
          ref={containerRef}
          className={`mermaid-chart p-4 bg-muted/30 rounded-lg border overflow-x-auto cursor-pointer hover:bg-muted/40 transition-colors ${className}`}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          onClick={() => setIsModalOpen(true)}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="h-8 gap-1"
          >
            <Expand className="h-3 w-3" />
            Enlarge
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              downloadChart();
            }}
            className="h-8 gap-1"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={chartTitle}
        onDownload={downloadChart}
      >
        <div
          className="mermaid-chart-modal flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </ChartModal>
    </>
  );
}


