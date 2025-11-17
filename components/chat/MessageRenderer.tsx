"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Image from "next/image";
import MermaidChart from "./MermaidChart";
import CodeBlock from "./CodeBlock";
import EnhancedTable from "./EnhancedTable";
import { SimulationRenderer } from "./SimulationRenderer";
import { buildMermaidFromChartData } from "@/lib/chart-data";

interface MessageRendererProps {
  content: string;
  className?: string;
}

type ReactNodeChild =
  | React.ReactElement
  | string
  | number
  | boolean
  | null
  | undefined;

interface ReactElementWithProps extends React.ReactElement {
  props: {
    node?: { tagName?: string };
    children?: ReactNodeChild | ReactNodeChild[];
    [key: string]: unknown;
  };
}

export default function MessageRenderer({
  content,
  className = "",
}: MessageRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Filter out images with empty src and use Next.js Image
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            return (
              <span className="block my-4">
                <Image
                  src={src}
                  alt={alt || ""}
                  width={800}
                  height={600}
                  className="rounded-lg border w-full h-auto"
                  unoptimized
                />
              </span>
            );
          },
          // Enhanced code block rendering
          code: ({ className, children, ...props }) => {
            // Match language names with hyphens (e.g., simulation-data)
            const match = /language-([\w-]+)/.exec(className || "");
            const language = match ? match[1] : "";

            // Extract code content more robustly
            let codeContent = "";
            if (Array.isArray(children)) {
              codeContent = children
                .map((child) =>
                  typeof child === "string" ? child : String(child)
                )
                .join("");
            } else if (typeof children === "string") {
              codeContent = children;
            } else if (children !== null && children !== undefined) {
              codeContent = String(children);
            }
            codeContent = codeContent.replace(/\n$/, "");

            // Check if it's a mermaid diagram
            if (language === "mermaid") {
              return <MermaidChart chart={codeContent} />;
            }

            if (language === "chart-data") {
              try {
                if (!codeContent || codeContent.trim().length === 0) {
                  return null;
                }
                const chartJson = JSON.parse(codeContent);
                const mermaidChart = buildMermaidFromChartData(chartJson);
                return <MermaidChart chart={mermaidChart} />;
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Invalid chart data";
                return (
                  <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4 my-2">
                    <p className="text-sm text-destructive font-semibold">
                      Unable to render structured chart
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      {message}
                    </p>
                    <details className="mt-3">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground font-semibold mb-2">
                        Raw chart payload
                      </summary>
                      <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-x-auto border">
                        {codeContent}
                      </pre>
                    </details>
                  </div>
                );
              }
            }

            // Check if it's simulation data for interactive rendering
            if (language === "simulation-data") {
              // Validate we have actual content
              if (
                !codeContent ||
                codeContent === "undefined" ||
                codeContent.trim() === ""
              ) {
                // Don't log errors for empty content during streaming
                return null;
              }

              // Check if content looks incomplete (streaming in progress)
              const trimmed = codeContent.trim();
              const hasOpeningBrace = trimmed.includes('{');
              const hasClosingBrace = trimmed.endsWith('}');

              // Show loading indicator while simulation is streaming
              if (hasOpeningBrace && !hasClosingBrace) {
                return (
                  <div className="border rounded-lg overflow-hidden bg-card my-4">
                    <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                        Building Simulation...
                      </h3>
                    </div>
                    <div className="p-8 flex flex-col items-center justify-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Processing simulation data...
                      </p>
                    </div>
                  </div>
                );
              }

              try {
                // Clean up the content - remove any leading/trailing text
                let cleanedContent = trimmed;

                // Try to extract JSON if there's extra text
                const jsonStartIndex = cleanedContent.indexOf('{');
                const jsonEndIndex = cleanedContent.lastIndexOf('}');

                // If we can't find both braces, the content is incomplete (streaming)
                if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
                  // Silently return null during streaming - don't spam console with errors
                  return null;
                }

                cleanedContent = cleanedContent.substring(jsonStartIndex, jsonEndIndex + 1);

                // Quick check: does it look like complete JSON?
                // Count opening and closing braces to detect truncation
                const openBraces = (cleanedContent.match(/{/g) || []).length;
                const closeBraces = (cleanedContent.match(/}/g) || []).length;

                if (openBraces !== closeBraces) {
                  // JSON is incomplete (streaming), show loading instead of null
                  return (
                    <div className="border rounded-lg overflow-hidden bg-card my-4">
                      <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          Building Simulation...
                        </h3>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
                          <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processing simulation data...
                        </p>
                      </div>
                    </div>
                  );
                }

                const simulationData = JSON.parse(cleanedContent);

                // Validate required fields
                if (!simulationData.data || !Array.isArray(simulationData.data)) {
                  // Show loading state if data field is missing (likely still streaming)
                  return (
                    <div className="border rounded-lg overflow-hidden bg-card my-4">
                      <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          Building Simulation...
                        </h3>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
                          <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processing simulation data...
                        </p>
                      </div>
                    </div>
                  );
                }

                // Validate data is complete (has at least a few data points)
                if (simulationData.data.length < 5) {
                  // Still loading, show loading state
                  return (
                    <div className="border rounded-lg overflow-hidden bg-card my-4">
                      <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          Building Simulation...
                        </h3>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
                          <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processing simulation data... ({simulationData.data.length} data points)
                        </p>
                      </div>
                    </div>
                  );
                }

                // Only log success when we actually succeed
                console.log("✅ Successfully parsed simulation data", {
                  dataPoints: simulationData.data?.length,
                  hasParameters: !!simulationData.parameters,
                  keys: Object.keys(simulationData)
                });

                // Use a stable key based on data length to prevent re-renders during streaming
                // This ensures SimulationRenderer only mounts once with complete data
                const stableKey = `sim-${simulationData.data.length}`;

                return <SimulationRenderer key={stableKey} initialData={simulationData} />;
              } catch (error) {
                // Only show error UI if content looks complete (has closing brace at end)
                const looksComplete = hasClosingBrace;

                if (!looksComplete) {
                  // Content is still streaming, show loading
                  return (
                    <div className="border rounded-lg overflow-hidden bg-card my-4">
                      <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          Building Simulation...
                        </h3>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
                          <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processing simulation data...
                        </p>
                      </div>
                    </div>
                  );
                }

                // Content looks complete but parsing failed - show error
                console.error("❌ Failed to parse complete simulation data:", error);

                const errorMessage = error instanceof Error ? error.message : String(error);

                return (
                  <div className="p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 font-semibold mb-2">
                      Error parsing simulation data
                    </p>
                    <p className="text-sm text-red-600 mb-2">
                      {errorMessage}
                    </p>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        Show raw content ({codeContent.length} chars)
                      </summary>
                      <pre className="mt-2 p-2 bg-red-100 rounded overflow-x-auto text-xs max-h-96">
                        {codeContent}
                      </pre>
                    </details>
                  </div>
                );
              }
            }

            // Inline code (no language specified and no newlines)
            if (!match && !codeContent.includes("\n")) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono border"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Code block with syntax highlighting
            return <CodeBlock code={codeContent} language={language} />;
          },

          // Enhanced table rendering
          table: ({ children, ...props }) => {
            // Extract headers and rows from the table
            const extractTableData = (): {
              headers: string[];
              rows: string[][];
            } => {
              const headers: string[] = [];
              const rows: string[][] = [];

              // This is a simplified extraction - in production you might want more robust parsing
              try {
                const childArray = Array.isArray(children)
                  ? children
                  : [children];

                childArray.forEach((child: ReactNodeChild) => {
                  if (
                    typeof child === "object" &&
                    child !== null &&
                    "type" in child &&
                    "props" in child
                  ) {
                    const childEl = child as ReactElementWithProps;
                    if (
                      childEl.type === "thead" ||
                      childEl.props?.node?.tagName === "thead"
                    ) {
                      const theadChildren = Array.isArray(
                        childEl.props?.children
                      )
                        ? childEl.props.children
                        : [childEl.props?.children];

                      theadChildren.forEach((tr: ReactNodeChild) => {
                        if (
                          typeof tr === "object" &&
                          tr !== null &&
                          "type" in tr &&
                          "props" in tr
                        ) {
                          const trEl = tr as ReactElementWithProps;
                          if (
                            trEl.type === "tr" ||
                            trEl.props?.node?.tagName === "tr"
                          ) {
                            const trChildren = Array.isArray(
                              trEl.props?.children
                            )
                              ? trEl.props.children
                              : [trEl.props?.children];

                            trChildren.forEach((th: ReactNodeChild) => {
                              if (
                                typeof th === "object" &&
                                th !== null &&
                                "type" in th &&
                                "props" in th
                              ) {
                                const thEl = th as ReactElementWithProps;
                                if (
                                  thEl.type === "th" ||
                                  thEl.props?.node?.tagName === "th"
                                ) {
                                  const content = extractTextContent(
                                    thEl.props?.children
                                  );
                                  if (content) headers.push(content);
                                }
                              }
                            });
                          }
                        }
                      });
                    }

                    if (
                      childEl.type === "tbody" ||
                      childEl.props?.node?.tagName === "tbody"
                    ) {
                      const tbodyChildren = Array.isArray(
                        childEl.props?.children
                      )
                        ? childEl.props.children
                        : [childEl.props?.children];

                      tbodyChildren.forEach((tr: ReactNodeChild) => {
                        if (
                          typeof tr === "object" &&
                          tr !== null &&
                          "type" in tr &&
                          "props" in tr
                        ) {
                          const trEl = tr as ReactElementWithProps;
                          if (
                            trEl.type === "tr" ||
                            trEl.props?.node?.tagName === "tr"
                          ) {
                            const row: string[] = [];
                            const trChildren = Array.isArray(
                              trEl.props?.children
                            )
                              ? trEl.props.children
                              : [trEl.props?.children];

                            trChildren.forEach((td: ReactNodeChild) => {
                              if (
                                typeof td === "object" &&
                                td !== null &&
                                "type" in td &&
                                "props" in td
                              ) {
                                const tdEl = td as ReactElementWithProps;
                                if (
                                  tdEl.type === "td" ||
                                  tdEl.props?.node?.tagName === "td"
                                ) {
                                  const content = extractTextContent(
                                    tdEl.props?.children
                                  );
                                  row.push(content || "");
                                }
                              }
                            });

                            if (row.length > 0) rows.push(row);
                          }
                        }
                      });
                    }
                  }
                });
              } catch (err) {
                console.error("Error extracting table data:", err);
              }

              return { headers, rows };
            };

            const extractTextContent = (
              node: ReactNodeChild | ReactNodeChild[]
            ): string => {
              if (typeof node === "string") return node;
              if (typeof node === "number") return String(node);
              if (Array.isArray(node))
                return node.map(extractTextContent).join("");
              if (
                typeof node === "object" &&
                node !== null &&
                "props" in node
              ) {
                const nodeEl = node as ReactElementWithProps;
                if (nodeEl.props?.children)
                  return extractTextContent(nodeEl.props.children);
              }
              return "";
            };

            const { headers, rows } = extractTableData();

            // Use enhanced table if we successfully extracted data
            if (headers.length > 0 && rows.length > 0) {
              return <EnhancedTable headers={headers} rows={rows} />;
            }

            // Fallback to default table rendering
            return (
              <div className="my-4 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm" {...props}>
                  {children}
                </table>
              </div>
            );
          },

          // Style other markdown elements
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-base font-semibold mt-3 mb-2" {...props}>
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p className="my-2 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-2 ml-4 list-disc space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-2 ml-4 list-decimal space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/50 pl-4 my-3 italic text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          hr: ({ ...props }) => (
            <hr className="my-4 border-border" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

