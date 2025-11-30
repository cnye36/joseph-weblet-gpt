"use client";

import React, { useMemo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Image from "next/image";
import MermaidChart from "./MermaidChart";
import CodeBlock from "./CodeBlock";
import EnhancedTable from "./EnhancedTable";
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
  const components: Components = useMemo(
    () => ({
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
            .map((child) => (typeof child === "string" ? child : String(child)))
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
              error instanceof Error ? error.message : "Invalid chart data";
            return (
              <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4 my-2">
                <p className="text-sm text-destructive font-semibold">
                  Unable to render structured chart
                </p>
                <p className="text-xs text-destructive/80 mt-1">{message}</p>
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
                  const theadChildren = Array.isArray(childEl.props?.children)
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
                        const trChildren = Array.isArray(trEl.props?.children)
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
                  const tbodyChildren = Array.isArray(childEl.props?.children)
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
                        const trChildren = Array.isArray(trEl.props?.children)
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
          if (Array.isArray(node)) return node.map(extractTextContent).join("");
          if (typeof node === "object" && node !== null && "props" in node) {
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
      hr: ({ ...props }) => <hr className="my-4 border-border" {...props} />,
    }),
    []
  );

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
