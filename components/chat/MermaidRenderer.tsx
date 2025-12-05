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
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "inherit",
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
