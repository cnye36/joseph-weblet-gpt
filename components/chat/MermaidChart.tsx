"use client";

import { useEffect, useRef, useState, memo } from "react";
import mermaid from "mermaid";
import { Expand, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartModal from "./ChartModal";

interface MermaidChartProps {
  chart: string;
  className?: string;
}

function MermaidChart({ chart, className = "" }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartTitle, setChartTitle] = useState("Mermaid Chart");
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderedChartRef = useRef<string | null>(null);

  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    const renderChart = async () => {
      if (!containerRef.current) return;

      // Validate chart content
      if (!chart || chart.trim().length === 0) {
        setError("Empty chart content provided");
        return;
      }

      let cleanChart = chart.trim();
      setError(null);

      console.log("=== MERMAID CHART RENDERING ===");
      console.log("Original chart prop:", chart);
      console.log("Clean chart:", cleanChart);
      console.log("================================");

      // Normalize first line for other diagram types when AI keeps directives inline
      cleanChart = cleanChart.replace(
        /^(flowchart\s+(?:LR|RL|TB|BT|TD))(?!\s*\n)/i,
        (match) => `${match}\n`
      );
      cleanChart = cleanChart.replace(
        /^(graph\s+(?:TB|BT|LR|RL))(?!\s*\n)/i,
        (match) => `${match}\n`
      );
      cleanChart = cleanChart.replace(
        /^(sequenceDiagram)(?!\s*\n)/i,
        (match) => `${match}\n`
      );

      // AGGRESSIVE AUTO-FIX for Gantt charts
      if (cleanChart.includes("gantt")) {
        try {
          // Step 1: Fix broken first line (gantt + title on same line)
          cleanChart = cleanChart.replace(
            /^gantt\s+title\s+/i,
            "gantt\n    title "
          );
          cleanChart = cleanChart.replace(
            /\s+dateFormat\s+YYYY-MM-DD/gi,
            "\n    dateFormat YYYY-MM-DD"
          );
          cleanChart = cleanChart.replace(/\s+section\s+/gi, "\n    section ");

          // Step 2: Split into lines and process
          const lines = cleanChart.split("\n");
          const rebuilt: string[] = [];

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            if (line.toLowerCase() === "gantt") {
              rebuilt.push("gantt");
              continue;
            }
            if (line.startsWith("title ")) {
              rebuilt.push("    " + line);
              continue;
            }
            if (line.startsWith("dateFormat ")) {
              rebuilt.push("    " + line);
              continue;
            }
            if (line.startsWith("section ")) {
              rebuilt.push("    " + line);
              continue;
            }

            if (
              line.includes(":") &&
              !line.startsWith("title") &&
              !line.startsWith("dateFormat")
            ) {
              const colonIdx = line.indexOf(":");
              const taskName = line.substring(0, colonIdx).trim();
              let taskData = line.substring(colonIdx + 1).trim();

              if (!taskData || taskData.length === 0) continue;

              taskData = taskData.replace(/^(.*?\d+[dhm])\s+.*$/, "$1");
              taskData = taskData.replace(
                /^(.*?after\s+\w+,\s*\d+[dhm])\s+.*$/,
                "$1"
              );
              taskData = taskData.replace(/^([a-z]+)\s+(\d{4}-)/i, "$1, $2");
              taskData = taskData.replace(/^([a-z]+)\s+(after\s)/i, "$1, $2");

              const parts = taskData.split(",").map((p) => p.trim());
              if (parts.length < 3) continue;

              if (parts[0] && !/^(done|active|crit|milestone)$/i.test(parts[0])) {
                parts[0] = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
              }

              if (!parts[0] || parts[0].length === 0) continue;

              rebuilt.push(`    ${taskName}    :${parts.join(", ")}`);
              continue;
            }
          }
          cleanChart = rebuilt.join("\n");
        } catch (fixError) {
          console.error("Auto-fix error:", fixError);
        }
      }

      try {
        // Basic validation
        if (
          !cleanChart.includes("gantt") &&
          !cleanChart.includes("flowchart") &&
          !cleanChart.includes("graph") &&
          !cleanChart.includes("sequenceDiagram")
        ) {
          setError(
            "Invalid Mermaid diagram type. Chart must start with 'gantt', 'flowchart', 'graph', or 'sequenceDiagram'"
          );
          return;
        }

        // Initialize mermaid with 'default' theme for colorful, high-contrast charts
        // This ensures text is always visible and charts look professional
        mermaid.initialize({
          startOnLoad: false,
          theme: "default", // Use Mermaid's default theme - colorful and clear
          themeVariables: {
            // Customize colors while keeping good contrast
            primaryColor: "#e3f2fd",
            primaryTextColor: "#1a1a1a",
            primaryBorderColor: "#1976d2",
            secondaryColor: "#fff3e0",
            secondaryTextColor: "#1a1a1a",
            secondaryBorderColor: "#f57c00",
            tertiaryColor: "#f3e5f5",
            tertiaryTextColor: "#1a1a1a",
            tertiaryBorderColor: "#7b1fa2",
            lineColor: "#455a64",
            textColor: "#1a1a1a",
            mainBkg: "#ffffff",
            nodeBorder: "#1976d2",
            clusterBkg: "#f5f5f5",
            clusterBorder: "#9e9e9e",
            defaultLinkColor: "#455a64",
            edgeLabelBackground: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "14px",
          },
          securityLevel: "loose",
          fontFamily: "system-ui, -apple-system, sans-serif",
          logLevel: "error",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            nodeSpacing: 50,
            rankSpacing: 50,
            padding: 15,
            useMaxWidth: true,
            defaultRenderer: "dagre-wrapper",
            wrappingWidth: 200,
          },
          gantt: {
            barHeight: 20,
            fontSize: 11,
            sectionFontSize: 11,
            numberSectionStyles: 3,
            axisFormat: "%Y-%m-%d",
            topPadding: 50
          }
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        await mermaid.parse(cleanChart);
        const { svg } = await mermaid.render(id, cleanChart);
        setSvgContent(svg);
        setError(null);
        lastRenderedChartRef.current = chart;

        const titleMatch = cleanChart.match(/title\s+(.+)/);
        if (titleMatch) {
          setChartTitle(titleMatch[1].trim());
        }
      } catch (err) {
        let errorMessage = "Failed to render chart";
        if (err instanceof Error) {
          errorMessage = err.message;
          if (err.message.includes("Parse error")) {
            errorMessage = `Syntax Error: ${err.message}\n\n⚠️ COMMON ISSUE: Extra text after task duration\nEach task must be on its OWN line with format:\nTask Name    :id, date, duration\n\nNOTHING can come after the duration!`;
          } else if (err.message.includes("Invalid date")) {
            errorMessage = `Date Error: ${err.message}\n\nMake sure all dates are in YYYY-MM-DD format (e.g., 2025-01-01)`;
          } else if (err.message.includes("No diagram type")) {
            errorMessage = `Diagram Type Error: Chart must start with 'gantt', 'flowchart TD', or similar`;
          }
        }
        setError(errorMessage);
      }
    };

    renderTimeoutRef.current = setTimeout(() => {
      renderChart();
      renderTimeoutRef.current = null;
    }, 100);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [chart]);

  if (error) {
    return (
      <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4 my-2">
        <p className="text-sm text-destructive font-medium">
          Chart rendering error:
        </p>
        <pre className="text-xs text-destructive/80 mt-2 overflow-x-auto whitespace-pre-wrap">
          {error}
        </pre>
        <details className="mt-3 open">
          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground font-semibold mb-2">
            Chart code (check for syntax errors):
          </summary>
          <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-x-auto border">
            {chart}
          </pre>
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
      <div className="relative group my-4 w-full flex justify-center">
        <div
          ref={containerRef}
          // Responsive container:
          // - w-auto inline-block: Size to content, don't stretch
          // - max-w-full: Prevent overflow
          className={`mermaid-chart p-4 bg-white rounded-lg border border-slate-200 overflow-auto cursor-pointer hover:shadow-md transition-all flex justify-center items-center w-auto inline-block max-w-full max-h-[500px] ${className}`}
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
          // Constrain modal content width
          className="mermaid-chart-modal flex items-center justify-center w-full min-h-[50vh] p-8 bg-white rounded-lg [&_svg]:max-w-[85%] [&_svg]:h-auto [&_svg]:w-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </ChartModal>
    </>
  );
}

export default memo(MermaidChart);
