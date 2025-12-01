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
    // Prevent re-rendering if chart content hasn't changed
    if (lastRenderedChartRef.current === chart) {
      return;
    }

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
      
      // Don't clear content immediately to prevent flashing
      // setSvgContent(""); 
      setError(null);

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
          // "gantt title Project..." -> "gantt\n    title Project..."
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

            // Keep gantt keyword
            if (line.toLowerCase() === "gantt") {
              rebuilt.push("gantt");
              continue;
            }

            // Keep title
            if (line.startsWith("title ")) {
              rebuilt.push("    " + line);
              continue;
            }

            // Keep dateFormat
            if (line.startsWith("dateFormat ")) {
              rebuilt.push("    " + line);
              continue;
            }

            // Keep section
            if (line.startsWith("section ")) {
              rebuilt.push("    " + line);
              continue;
            }

            // Handle task lines (contain a colon)
            if (
              line.includes(":") &&
              !line.startsWith("title") &&
              !line.startsWith("dateFormat")
            ) {
              const colonIdx = line.indexOf(":");
              const taskName = line.substring(0, colonIdx).trim();
              let taskData = line.substring(colonIdx + 1).trim();

              // CRITICAL VALIDATION: Skip if no data after colon
              if (!taskData || taskData.length === 0) {
                continue;
              }

              // CRITICAL: Remove everything after duration
              // Match: "lit, 2025-10-01, 13d Literature" -> "lit, 2025-10-01, 13d"
              taskData = taskData.replace(/^(.*?\d+[dhm])\s+.*$/, "$1");

              // Also handle "after" syntax
              // Match: "hypo, after lit, 6d Hypothesis" -> "hypo, after lit, 6d"
              taskData = taskData.replace(
                /^(.*?after\s+\w+,\s*\d+[dhm])\s+.*$/,
                "$1"
              );

              // Fix missing commas after task ID
              // "lit 2025-10-01" -> "lit, 2025-10-01"
              // "review 2026-01-16" -> "review, 2026-01-16"
              taskData = taskData.replace(/^([a-z]+)\s+(\d{4}-)/i, "$1, $2");
              taskData = taskData.replace(/^([a-z]+)\s+(after\s)/i, "$1, $2");

              // Normalize task IDs to lowercase
              const parts = taskData.split(",").map((p) => p.trim());

              // Validate we have at least 3 parts: id, date/after, duration
              if (parts.length < 3) {
                continue;
              }

              // Fix task ID (first part)
              if (
                parts[0] &&
                !/^(done|active|crit|milestone)$/i.test(parts[0])
              ) {
                parts[0] = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
              }

              // Validate task ID exists
              if (!parts[0] || parts[0].length === 0) {
                continue;
              }

              rebuilt.push(`    ${taskName}    :${parts.join(", ")}`);
              continue;
            }
          }

          cleanChart = rebuilt.join("\n");
        } catch (fixError) {
          console.error("Auto-fix error:", fixError);
        }
      }

      // Detect current theme
      const isDark = document.documentElement.classList.contains("dark");
      
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

        // Initialize mermaid with configuration
        // We use "default" theme and rely on CSS variables for colors
        // This avoids complex injection and ensures consistency
        mermaid.initialize({
          startOnLoad: false,
          theme: "default", 
          securityLevel: "loose",
          fontFamily: "inherit",
          logLevel: "error",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
            nodeSpacing: 30,
            rankSpacing: 30,
            padding: 10,
            useMaxWidth: true, // Allow it to scale
            defaultRenderer: "dagre-wrapper",
            wrappingWidth: 150,
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

        // Generate unique ID for this chart
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Perform a dry-run parse to surface syntax errors without spamming console
        await mermaid.parse(cleanChart);

        // Render the chart
        const { svg } = await mermaid.render(id, cleanChart);
        setSvgContent(svg);
        setError(null);
        lastRenderedChartRef.current = chart;

        // Extract title from chart if available
        const titleMatch = cleanChart.match(/title\s+(.+)/);
        if (titleMatch) {
          setChartTitle(titleMatch[1].trim());
        }
      } catch (err) {
        // Extract more detailed error information
        let errorMessage = "Failed to render chart";
        if (err instanceof Error) {
          errorMessage = err.message;

          // Try to extract more specific error details
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

    // Small delay to ensure DOM is ready
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
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">Common fixes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Ensure dateFormat is:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  dateFormat YYYY-MM-DD
                </code>
              </li>
              <li>
                Task format:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  Task Name :id, 2025-01-01, 30d
                </code>
              </li>
              <li>Task IDs must be lowercase letters only</li>
              <li>Dates must be YYYY-MM-DD format</li>
              <li>Use 4 spaces for indentation</li>
            </ul>
          </div>
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
      <div className="relative group my-4 w-full">
        <div
          ref={containerRef}
          // Responsive container:
          // - w-full: Use full width
          // - max-h-[500px]: Limit height for inline view
          // - overflow-auto: Scroll if content is too big
          // - flex justify-center: Center the chart
          className={`mermaid-chart p-4 bg-muted/30 rounded-lg border overflow-auto cursor-pointer hover:bg-muted/40 transition-colors flex justify-center items-center w-full max-h-[500px] ${className}`}
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

export default memo(MermaidChart);
