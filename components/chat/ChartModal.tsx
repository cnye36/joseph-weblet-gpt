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
    if (!svg) return;

    // Clone the SVG to avoid modifying the DOM
    const clonedSvg = svg.cloneNode(true) as SVGElement;

    // Get viewBox or compute dimensions from the SVG's internal size
    let viewBox = svg.getAttribute("viewBox");
    let width: number;
    let height: number;

    if (viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      width = parts[2] || 800;
      height = parts[3] || 600;
    } else {
      // Fallback to getBBox for accurate SVG content dimensions
      try {
        const bbox = svg.getBBox();
        width = Math.ceil(bbox.width + bbox.x * 2) || 800;
        height = Math.ceil(bbox.height + bbox.y * 2) || 600;
        viewBox = `0 0 ${width} ${height}`;
      } catch {
        // getBBox may fail if SVG is not rendered, use client rect
        const rect = svg.getBoundingClientRect();
        width = Math.ceil(rect.width) || 800;
        height = Math.ceil(rect.height) || 600;
        viewBox = `0 0 ${width} ${height}`;
      }
    }

    // Add padding for better presentation
    const padding = 40;
    const paddedWidth = width + padding * 2;
    const paddedHeight = height + padding * 2;

    // Set proper SVG attributes
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clonedSvg.setAttribute("width", paddedWidth.toString());
    clonedSvg.setAttribute("height", paddedHeight.toString());

    // Inline computed styles for elements that need them (preserve existing styles)
    const inlineStyles = (element: Element, originalElement: Element) => {
      // Skip style and defs elements
      if (element.tagName === "style" || element.tagName === "defs") return;

      const computed = window.getComputedStyle(originalElement);
      const existingStyle = element.getAttribute("style") || "";

      // Properties that are relevant for SVG rendering
      const relevantProps = [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-linecap",
        "stroke-linejoin",
        "opacity",
        "fill-opacity",
        "stroke-opacity",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "text-anchor",
        "dominant-baseline",
        "alignment-baseline",
      ];

      // Build style string from relevant computed styles (only if not already set)
      const existingProps = new Set(
        existingStyle.split(";").map((s) => s.split(":")[0].trim())
      );

      const additionalStyles = relevantProps.reduce((str, prop) => {
        if (existingProps.has(prop)) return str;
        const value = computed.getPropertyValue(prop);
        if (value && value !== "" && value !== "none" && value !== "normal") {
          return `${str}${prop}:${value};`;
        }
        return str;
      }, "");

      if (additionalStyles) {
        element.setAttribute("style", existingStyle + additionalStyles);
      }

      // Recursively process children
      const children = Array.from(element.children);
      const originalChildren = Array.from(originalElement.children);
      children.forEach((child, index) => {
        if (originalChildren[index]) {
          inlineStyles(child, originalChildren[index]);
        }
      });
    };

    // Apply inline styles to all elements
    inlineStyles(clonedSvg, svg);

    // Create a wrapper group for the original content and translate it for padding
    const contentGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    contentGroup.setAttribute("transform", `translate(${padding}, ${padding})`);

    // Move all existing children into the content group
    while (clonedSvg.firstChild) {
      contentGroup.appendChild(clonedSvg.firstChild);
    }

    // Add a white background rectangle
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("width", paddedWidth.toString());
    background.setAttribute("height", paddedHeight.toString());
    background.setAttribute("fill", "#ffffff");

    // Add background first, then content
    clonedSvg.appendChild(background);
    clonedSvg.appendChild(contentGroup);

    // Update viewBox to match padded dimensions
    clonedSvg.setAttribute("viewBox", `0 0 ${paddedWidth} ${paddedHeight}`);

    // Serialize and download
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
