"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { SimulationRenderer } from "./SimulationRenderer";

interface ToolCallDisplayProps {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: "call" | "result" | "partial-call";
}

interface SimulationResult {
  type?: string;
  data?: Array<Record<string, number | string>>;
  parameters?: Record<
    string,
    {
      value: number;
      min: number;
      max: number;
      step?: number;
      unit?: string;
      label?: string;
    }
  >;
  labels?: {
    x?: string;
    y?: string;
    title?: string;
  };
  chartType?: "line" | "area" | "scatter";
  description?: string;
  isSimulation?: boolean;
}

interface ArxivPaper {
  title?: string;
  id?: string;
  identifier?: string;
  url?: string;
  link?: string;
  links?: Array<{ href?: string }>;
  authors?: Array<string | { name?: string }>;
  published?: string;
  summary?: string;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const normalizeArxivId = (value?: string) => {
  if (!value || typeof value !== "string") return null;
  return value.replace(/^arxiv:/i, "").trim();
};

const extractAuthorLine = (paper: ArxivPaper) => {
  if (!paper.authors) return null;
  const normalized = paper.authors
    .map((author) => {
      if (typeof author === "string") return author;
      if (isRecord(author) && typeof author.name === "string") {
        return author.name;
      }
      return null;
    })
    .filter(Boolean) as string[];
  if (!normalized.length) return null;
  return normalized.join(", ");
};

const getPaperUrl = (paper: ArxivPaper) => {
  if (paper.url && typeof paper.url === "string") return paper.url;
  if (paper.link && typeof paper.link === "string") return paper.link;
  if (Array.isArray(paper.links)) {
    const link = paper.links.find(
      (entry) => entry && typeof entry.href === "string"
    );
    if (link?.href) return link.href;
  }
  const identifier =
    (typeof paper.identifier === "string" && paper.identifier) ||
    (typeof paper.id === "string" && paper.id);
  const normalized = normalizeArxivId(identifier || undefined);
  if (normalized) {
    return `https://arxiv.org/abs/${normalized}`;
  }
  return null;
};

const getPaperIdentifier = (paper: ArxivPaper) => {
  const raw =
    (typeof paper.identifier === "string" && paper.identifier) ||
    (typeof paper.id === "string" && paper.id);
  if (raw) {
    const normalized = normalizeArxivId(raw);
    if (normalized) return normalized;
  }
  if (paper.url && typeof paper.url === "string") {
    const match = paper.url.match(/arxiv\.org\/(?:abs|pdf)\/([^?/#]+)/i);
    if (match?.[1]) return normalizeArxivId(match[1]);
  }
  if (paper.link && typeof paper.link === "string") {
    const match = paper.link.match(/arxiv\.org\/(?:abs|pdf)\/([^?/#]+)/i);
    if (match?.[1]) return normalizeArxivId(match[1]);
  }
  if (Array.isArray(paper.links)) {
    for (const entry of paper.links) {
      if (entry?.href && typeof entry.href === "string") {
        const match = entry.href.match(/arxiv\.org\/(?:abs|pdf)\/([^?/#]+)/i);
        if (match?.[1]) return normalizeArxivId(match[1]);
      }
    }
  }
  return null;
};

const getPaperPdfUrl = (paper: ArxivPaper) => {
  const identifier = getPaperIdentifier(paper);
  if (identifier) {
    return `https://arxiv.org/pdf/${identifier}.pdf`;
  }
  const canonical = getPaperUrl(paper);
  if (canonical && canonical.includes("/abs/")) {
    return canonical.replace("/abs/", "/pdf/") + ".pdf";
  }
  return null;
};

const parseArxivResult = (input: unknown): unknown => {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  return input;
};

const looksLikePaperArray = (value: unknown): value is ArxivPaper[] => {
  if (!Array.isArray(value)) return false;
  return value.some(
    (entry) =>
      isRecord(entry) &&
      (typeof entry.title === "string" ||
        typeof entry.id === "string" ||
        typeof entry.identifier === "string")
  );
};

const extractArxivPapers = (data: unknown, depth = 0): ArxivPaper[] => {
  if (!data || depth > 4) return [];
  if (Array.isArray(data)) {
    if (looksLikePaperArray(data)) {
      return data as ArxivPaper[];
    }
    for (const entry of data) {
      const nested = extractArxivPapers(entry, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }
  if (isRecord(data)) {
    const candidateKeys = ["papers", "results", "items", "entries", "matches"];
    for (const key of candidateKeys) {
      if (key in data) {
        const nested = extractArxivPapers(data[key], depth + 1);
        if (nested.length) return nested;
      }
    }
    for (const value of Object.values(data)) {
      const nested = extractArxivPapers(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
};

export function ToolCallDisplay({
  toolName,
  toolCallId,
  args,
  result,
  state,
}: ToolCallDisplayProps) {
  const [showPayload, setShowPayload] = useState(false);

  // Check if result is a simulation
  const isSimulationResult = (res: unknown): res is SimulationResult => {
    if (!res || typeof res !== "object") return false;
    const obj = res as Record<string, unknown>;
    
    // Check for explicit simulation flag
    if (obj.isSimulation === true) return true;
    
    // Check for simulation data structure
    if (obj.data && Array.isArray(obj.data) && obj.data.length > 0) {
      return true;
    }
    
    return false;
  };

  const simulationResult = result && isSimulationResult(result) ? result : null;

  const isArxivTool = toolName.toLowerCase().includes("arxiv");

  const parsedResult = useMemo(() => parseArxivResult(result), [result]);
  const arxivPapers = useMemo(
    () => (isArxivTool ? extractArxivPapers(parsedResult) : []),
    [parsedResult, isArxivTool]
  );

  // Determine which MCP server this tool belongs to
  const getServerInfo = () => {
    if (isArxivTool) {
      return {
        name: "ArXiv",
        icon: BookOpen,
        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
      };
    }
    // Check for simulation-related tool names
    if (
      toolName.toLowerCase().includes("simulation") ||
      toolName.toLowerCase().includes("simulate") ||
      toolName.toLowerCase().includes("physics") ||
      toolName.toLowerCase().includes("trajectory")
    ) {
      return {
        name: "Simulation",
        icon: FlaskConical,
        color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
      };
    }
    // Default
    return {
      name: "Tool",
      icon: FlaskConical,
      color: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700",
    };
  };

  const serverInfo = getServerInfo();
  const Icon = serverInfo.icon;

  // Generate display text
  const getDisplayText = () => {
    if (state === "partial-call") {
      return `Calling ${serverInfo.name}...`;
    }
    if (state === "call") {
      return `Querying ${serverInfo.name}`;
    }
    return `${serverInfo.name} Response`;
  };

  const getStatusSubtext = () => {
    if (state === "partial-call") {
      return "Live tool execution in progress";
    }
    if (state === "result" && isArxivTool && arxivPapers.length > 0) {
      return `Retrieved ${arxivPapers.length} paper${
        arxivPapers.length === 1 ? "" : "s"
      }`;
    }
    if (state === "result") {
      return "Tool response received";
    }
    return toolName;
  };

  const hasAdvancedData =
    !!toolCallId ||
    (args && Object.keys(args).length > 0) ||
    typeof result !== "undefined";

  const renderArxivProcessing = () => (
    <div className="px-3 pb-3">
      <div className="flex items-start gap-3 rounded-md border border-dashed border-blue-300 bg-blue-50/70 px-3 py-2 text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
        <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Searching the arXiv catalog...</p>
          <p className="text-xs opacity-80">
            Hang tight—once the papers come back, they will be summarized below
            with direct links.
          </p>
        </div>
      </div>
    </div>
  );

const renderGenericProcessing = () => (
  <div className="px-3 pb-3">
    <div className="flex items-start gap-3 rounded-md border border-dashed border-current/40 bg-black/[0.02] px-3 py-2 text-foreground dark:bg-white/5">
      <Loader2 className="size-4 shrink-0 animate-spin" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">
          Running {serverInfo.name} tool call...
        </p>
        <p className="text-xs opacity-80">
          We’ll display the exact request and JSON response as soon as it lands.
        </p>
      </div>
    </div>
  </div>
);

  const renderArxivPapers = () => {
    if (!isArxivTool || arxivPapers.length === 0) return null;

    const papersToShow = arxivPapers.slice(0, 6);
    const remaining = arxivPapers.length - papersToShow.length;

    return (
      <div className="border-t border-current/10 px-3 pb-3 pt-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
          Referenced Papers
        </div>
        <ul className="mt-2 space-y-2 text-sm">
          {papersToShow.map((paper, idx) => {
            const title =
              (typeof paper.title === "string" && paper.title) ||
              normalizeArxivId(
                (typeof paper.id === "string" && paper.id) ||
                  (typeof paper.identifier === "string" && paper.identifier) ||
                  undefined
              ) ||
              `Paper ${idx + 1}`;
            const paperUrl = getPaperUrl(paper);
            const pdfUrl = getPaperPdfUrl(paper);
            const authorLine = extractAuthorLine(paper);
            const published =
              typeof paper.published === "string"
                ? new Date(paper.published).toISOString().slice(0, 10)
                : null;

            return (
              <li key={`${title}-${idx}`} className="space-y-0.5">
                {paperUrl ? (
                  <a
                    href={paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                  >
                    {title}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">{title}</span>
                )}
                {(authorLine || published) && (
                  <div className="text-xs text-muted-foreground">
                    {authorLine && <span>{authorLine}</span>}
                    {authorLine && published && <span> • </span>}
                    {published && <span>{published}</span>}
                  </div>
                )}
                {(paperUrl || pdfUrl) && (
                  <div className="text-[11px] text-muted-foreground space-x-2">
                    {paperUrl && (
                      <a
                        href={paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline text-blue-700 dark:text-blue-300"
                      >
                        Abstract
                      </a>
                    )}
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline text-blue-700 dark:text-blue-300"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {remaining > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            +{remaining} more retrieved via ArXiv
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${serverInfo.color} my-2 overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="size-4 shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-sm">{getDisplayText()}</span>
          <span className="text-[11px] text-muted-foreground">
            {getStatusSubtext()}
          </span>
        </div>
      </div>

      {state === "partial-call" &&
        (isArxivTool ? renderArxivProcessing() : renderGenericProcessing())}

      {/* Render simulation visualization if result is a simulation */}
      {simulationResult && (
        <div className="px-3 pb-3">
          <SimulationRenderer initialData={simulationResult} />
        </div>
      )}

      {renderArxivPapers()}

      {/* Advanced payload */}
      {hasAdvancedData && (
        <div className="border-t border-current/10">
          <button
            onClick={() => setShowPayload((prev) => !prev)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide hover:bg-black/5 dark:hover:bg-white/5"
          >
            {showPayload ? (
              <ChevronDown className="size-3.5 shrink-0" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0" />
            )}
            Advanced: View tool request & response
          </button>

          {showPayload && (
            <div className="space-y-3 px-3 pb-3 pt-1">
              <div>
                <div className="text-xs font-semibold mb-1 opacity-70">
                  Tool Call ID
                </div>
                <div className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded px-2 py-1 break-all">
                  {toolCallId}
                </div>
              </div>

              {args && Object.keys(args).length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    Arguments
                  </div>
                  <pre className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded px-2 py-1 overflow-x-auto">
                    {JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              )}

              {typeof result !== "undefined" && (
                <div>
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    Response
                  </div>
                  <pre className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded px-2 py-1 overflow-x-auto max-h-60">
                    {typeof result === "string"
                      ? result
                      : JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

