"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { ChartToolConfig } from "@/lib/chart-schemas";

interface MermaidRendererProps {
  config: ChartToolConfig;
}

export function MermaidRendererComponent({ config }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      themeVariables: {
        // Custom dark theme with all colors embedded in SVG
        darkMode: true,
        background: "#111827",
        primaryColor: "#1f2937",
        primaryTextColor: "#fff",
        primaryBorderColor: "#6b7280",
        lineColor: "#9ca3af",
        secondaryColor: "#374151",
        tertiaryColor: "#4b5563",

        // Text and labels
        mainBkg: "#1f2937",
        secondBkg: "#374151",
        tertiaryBkg: "#4b5563",
        textColor: "#fff",
        border1: "#6b7280",
        border2: "#9ca3af",
        note: "#fff",
        noteTextColor: "#fff",
        noteBkgColor: "#374151",
        noteBorderColor: "#6b7280",

        // Nodes and edges
        nodeBorder: "#6b7280",
        clusterBkg: "#374151",
        clusterBorder: "#6b7280",
        defaultLinkColor: "#9ca3af",
        titleColor: "#fff",
        edgeLabelBackground: "#1f2937",
        nodeTextColor: "#fff",

        // Flowchart specific
        labelColor: "#fff",
        labelTextColor: "#fff",
        labelBoxBkgColor: "#1f2937",
        labelBoxBorderColor: "#6b7280",

        // Gantt specific
        gridColor: "#6b7280",
        todayLineColor: "#ef4444",
        sectionBkgColor: "#1f2937",
        sectionBkgColor2: "#374151",
        altSectionBkgColor: "#374151",
        taskBorderColor: "#6b7280",
        taskBkgColor: "#374151",
        taskTextColor: "#e5e7eb",
        taskTextLightColor: "#e5e7eb",
        taskTextOutsideColor: "#e5e7eb",
        taskTextClickableColor: "#60a5fa",
        activeTaskBorderColor: "#3b82f6",
        activeTaskBkgColor: "#1e40af",
        doneTaskBkgColor: "#065f46",
        doneTaskBorderColor: "#10b981",
        critBkgColor: "#991b1b",
        critBorderColor: "#ef4444",

        // Sequence diagrams
        actorBorder: "#6b7280",
        actorBkg: "#1f2937",
        actorTextColor: "#fff",
        actorLineColor: "#9ca3af",
        signalColor: "#e5e7eb",
        signalTextColor: "#fff",
        sequenceNumberColor: "#fff",
        activationBorderColor: "#6b7280",
        activationBkgColor: "#374151",
        loopTextColor: "#fff",

        // Error states
        errorBkgColor: "#991b1b",
        errorTextColor: "#fff",
      },
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const definition = generateMermaidDefinition(config);
        
        console.log("Mermaid Definition:", definition);

        const { svg } = await mermaid.render(id, definition);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError("Failed to render chart. Please try again.");
      }
    };

    renderChart();
  }, [config]);

  return (
    <div className="w-full flex flex-col items-center">
      {config.title && (
        <h3 className="text-center font-semibold mb-4 text-sm text-muted-foreground">
          {config.title}
        </h3>
      )}
      
      {error ? (
        <div className="text-red-500 p-4 border border-red-500/20 rounded bg-red-500/10">
          {error}
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="w-full overflow-x-auto flex justify-center p-4 bg-white/5 rounded-lg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}

export const MermaidRenderer = React.memo(MermaidRendererComponent);

function generateMermaidDefinition(config: ChartToolConfig): string {
  if (config.type === "flowchart") {
    const direction = config.direction || "TD";
    let def = `graph ${direction}\n`;
    
    // Add nodes
    config.nodes?.forEach((node) => {
      const shapeStart = getShapeStart(node.shape);
      const shapeEnd = getShapeEnd(node.shape);
      // Escape label quotes
      const label = node.label.replace(/"/g, "'");
      def += `    ${node.id}${shapeStart}"${label}"${shapeEnd}\n`;
    });

    // Add edges
    config.edges?.forEach((edge) => {
      const arrow = "-->"; // Standard arrow
      const label = edge.label ? `|"${edge.label.replace(/"/g, "'")}"|` : "";
      def += `    ${edge.from} ${arrow} ${label} ${edge.to}\n`;
    });

    // Add some basic styling
    def += `    classDef default fill:#1f2937,stroke:#6b7280,stroke-width:2px,color:#fff;\n`;
    
    return def;
  }

  if (config.type === "gantt") {
    let def = `gantt\n    title ${config.title || "Gantt Chart"}\n    dateFormat YYYY-MM-DD\n    axisFormat %Y-%m-%d\n\n`;
    
    def += `    section Tasks\n`;
    config.tasks?.forEach((task) => {
      let line = `    ${task.label} :${task.id}, `;
      
      if (task.start) {
        line += `${task.start}, `;
      } else if (task.dependsOn && task.dependsOn.length > 0) {
        line += `after ${task.dependsOn[0]}, `;
      }
      
      if (task.duration) {
        line += `${task.duration}`;
      } else if (task.end) {
        line += `${task.end}`;
      } else {
        // Default duration if neither provided
        line += `1d`;
      }
      
      def += `${line}\n`;
    });

    return def;
  }

  return "";
}

function getShapeStart(shape?: string) {
  switch (shape) {
    case "rect": return "[";
    case "circle": return "((";
    case "diamond": return "{";
    case "stadium": return "([";
    case "cylinder": return "[(";
    case "subroutine": return "[[";
    default: return "[";
  }
}

function getShapeEnd(shape?: string) {
  switch (shape) {
    case "rect": return "]";
    case "circle": return "))";
    case "diamond": return "}";
    case "stadium": return "])";
    case "cylinder": return ")]";
    case "subroutine": return "]]";
    default: return "]";
  }
}
