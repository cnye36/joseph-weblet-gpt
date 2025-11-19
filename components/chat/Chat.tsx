"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { UIMessage, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Send, BookOpen, FlaskConical } from "lucide-react";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MessageRenderer from "./MessageRenderer";
import { ToolCallDisplay } from "./ToolCallDisplay";

export default function Chat({
  botId,
  chatId,
}: {
  botId: string;
  chatId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdRef = useRef<string | null>(chatId);
  const [enableMCP, setEnableMCP] = useState(false);
  const [enableSimulation, setEnableSimulation] = useState(false);

  // Use refs to track current state for dynamic body values (AI SDK v5)
  const enableMCPRef = useRef(enableMCP);
  const enableSimulationRef = useRef(enableSimulation);

  useEffect(() => {
    enableMCPRef.current = enableMCP;
    enableSimulationRef.current = enableSimulation;
  }, [enableMCP, enableSimulation]);

  const isNewChat = searchParams.get("new") === "true";
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: useMemo(
      () =>
        new DefaultChatTransport({
          api: "/api/chat",
          body: () => ({
            botId,
            enableMCP: enableMCPRef.current,
            enableSimulation: enableSimulationRef.current,
          }),
        }),
      [botId]
    ),
    onFinish: async ({ message }) => {
      console.log("🎯 CHAT COMPONENT: onFinish called", { message });
      const finishedChatId = chatIdRef.current;
      if (finishedChatId) {
        const msg = message as unknown as {
          parts?: unknown;
          content?: unknown;
        };
        const rawParts = Array.isArray(msg.parts)
          ? msg.parts
          : Array.isArray(msg.content)
          ? msg.content
          : typeof msg.content === "string"
          ? [{ type: "text", text: msg.content }]
          : [];
        const text = (rawParts as unknown[])
          .map((p) => {
            if (
              p &&
              typeof p === "object" &&
              "type" in (p as Record<string, unknown>)
            ) {
              const part = p as { type: string; text?: string };
              if (part.type === "text" && typeof part.text === "string")
                return part.text;
            }
            return "";
          })
          .filter((s) => s.length > 0)
          .join("");
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: finishedChatId,
            role: "assistant",
            content: text,
          }),
        });
      }
    },
  });

  // Debug: Log status changes
  useEffect(() => {
    console.log("🔄 CHAT STATUS CHANGED:", status);
  }, [status]);

  // Create rerun callback for simulations
  const handleRerunSimulation = useMemo(
    () => async (params: Record<string, number>) => {
      // Build a natural language message asking the LLM to rerun with new parameters
      const paramDescriptions: string[] = [];

      // Map parameter names to descriptions
      const paramLabels: Record<string, string> = {
        beta: "infection rate (β)",
        gamma: "recovery rate (γ)",
        S: "susceptible population",
        I: "infected population",
        R: "recovered population",
      };

      Object.entries(params).forEach(([key, value]) => {
        const label = paramLabels[key] || key;
        paramDescriptions.push(`${label} = ${value.toFixed(3)}`);
      });

      const message = `Please rerun the SIR model simulation with the following updated parameters: ${paramDescriptions.join(
        ", "
      )}.`;

      // Send the message to the LLM
      const messageParts = [{ type: "text" as const, text: message }];
      await (
        sendMessage as unknown as (arg: {
          content: typeof messageParts;
        }) => Promise<void>
      )({ content: messageParts });
    },
    [sendMessage]
  );

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<
    {
      name: string;
      type: string;
      size: number;
      dataUrl?: string;
      textContent?: string;
    }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!chatId) return;
      const res = await fetch(`/api/messages?chatId=${chatId}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: { role: UIMessage["role"]; content: string }[];
      };
      setMessages(
        data.messages.map((m, i) => ({
          id: String(i),
          role: m.role,
          parts: [{ type: "text", text: m.content }],
        })) as UIMessage[]
      );
    })();
  }, [chatId, setMessages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-7xl mx-auto space-y-3 pb-4">
          {messages.map((m: UIMessage) => {
            // Check if this message contains a simulation - if so, we'll render it full width
            const msg = m as unknown as { parts?: unknown; content?: unknown };
            const parts = Array.isArray(msg.parts)
              ? msg.parts
              : Array.isArray(msg.content)
              ? msg.content
              : typeof msg.content === "string"
              ? [{ type: "text", text: msg.content }]
              : [];

            const hasSimulation = (parts as unknown[]).some((p: unknown) => {
              const part = p as { type?: string; toolName?: string };
              return (
                part.type?.startsWith("tool-") &&
                (part.toolName === "simulate_model" ||
                  part.type.includes("simulate"))
              );
            });

            return (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                } ${hasSimulation ? "w-full" : ""}`}
              >
                <div
                  className={`space-y-1 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-600 text-white max-w-[80%] px-3 py-2"
                      : hasSimulation
                      ? "bg-muted w-full max-w-none px-0 py-2"
                      : "bg-muted max-w-[80%] px-3 py-2"
                  }`}
                >
                  <div className="text-xs opacity-70">{m.role}</div>
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    {(() => {
                      const msg = m as unknown as {
                        parts?: unknown;
                        content?: unknown;
                      };
                      const parts = Array.isArray(msg.parts)
                        ? msg.parts
                        : Array.isArray(msg.content)
                        ? msg.content
                        : typeof msg.content === "string"
                        ? [{ type: "text", text: msg.content }]
                        : [];

                      // Debug: Log all parts for assistant messages
                      if (m.role === "assistant") {
                        console.log("🔍 CHAT: Assistant message structure", {
                          messageId: m.id,
                          hasParts: Array.isArray(msg.parts),
                          hasContent: !!msg.content,
                          partsCount: parts.length,
                          rawMessage: {
                            parts: msg.parts,
                            content:
                              typeof msg.content === "string"
                                ? msg.content.substring(0, 100)
                                : msg.content,
                          },
                          parts: parts.map((p: unknown) => {
                            const part = p as {
                              type?: string;
                              toolName?: string;
                              toolCallId?: string;
                              result?: unknown;
                            };
                            return {
                              type: part.type,
                              toolName: part.toolName,
                              toolCallId: part.toolCallId,
                              hasResult: !!part.result,
                            };
                          }),
                        });
                      }

                      // FIRST PASS: Collect tool call data to make rendering decisions
                      // Handle both old format (tool-call) and new format (tool-{toolName})
                      const toolCallsMap = new Map<
                        string,
                        Record<string, unknown>
                      >();
                      // Track which toolCallIds have results (to prevent double rendering)
                      const toolResultsSet = new Set<string>();
                      // Track which tool names have successful results (to skip invalid retries)
                      const successfulToolNames = new Set<string>();
                      // Track invalid toolCallIds that should be skipped
                      const invalidToolCallIds = new Set<string>();
                      // Map tool names to successful toolCallIds
                      const toolNameToSuccessfulCallId = new Map<
                        string,
                        string
                      >();

                      (parts as unknown[]).forEach((p) => {
                        const part = p as {
                          type?: string;
                          toolCallId?: string;
                          toolName?: string;
                          args?: Record<string, unknown>;
                          input?: Record<string, unknown>;
                          state?: string;
                          result?: unknown;
                          output?: unknown;
                          invalid?: boolean;
                          error?: unknown;
                        };
                        // Old format: tool-call
                        if (
                          part.type === "tool-call" &&
                          part.toolCallId &&
                          part.args
                        ) {
                          toolCallsMap.set(part.toolCallId, part.args);
                        }
                        // New format: tool-{toolName} with input
                        if (part.type?.startsWith("tool-") && part.toolCallId) {
                          const args = part.input || part.args;
                          if (args) {
                            toolCallsMap.set(part.toolCallId, args);
                          }
                          // Extract tool name
                          const toolName =
                            part.toolName ||
                            (part.type?.startsWith("tool-")
                              ? part.type.replace("tool-", "")
                              : "unknown");

                          // Track invalid tool calls without results
                          if (
                            (part.invalid === true || part.error) &&
                            part.output === undefined &&
                            part.result === undefined
                          ) {
                            invalidToolCallIds.add(part.toolCallId);
                          }

                          // If this part has a result, mark it
                          if (
                            part.output !== undefined ||
                            part.result !== undefined
                          ) {
                            toolResultsSet.add(part.toolCallId);
                            // Mark this tool name as having a successful result
                            // (if it's not invalid or errored)
                            if (!part.invalid && !part.error) {
                              successfulToolNames.add(toolName);
                              toolNameToSuccessfulCallId.set(
                                toolName,
                                part.toolCallId
                              );
                            }
                          }
                        }
                        // Legacy format: tool-result
                        if (part.type === "tool-result" && part.toolCallId) {
                          toolResultsSet.add(part.toolCallId);
                          const toolName = (part as { toolName?: string })
                            .toolName;
                          if (toolName) {
                            successfulToolNames.add(toolName);
                            toolNameToSuccessfulCallId.set(
                              toolName,
                              part.toolCallId
                            );
                          }
                        }
                      });

                      return (parts as unknown[]).map((p, idx: number) => {
                        type UIInlinePart =
                          | { type: "text"; text: string }
                          | { type: "image"; image: string }
                          | {
                              type: "file";
                              file: {
                                name: string;
                                type: string;
                                size: number;
                              };
                            }
                          | {
                              type: "tool-call";
                              toolCallId: string;
                              toolName: string;
                              args: Record<string, unknown>;
                            }
                          | {
                              type: "tool-result";
                              toolCallId: string;
                              toolName: string;
                              result: unknown;
                              args?: Record<string, unknown>;
                            }
                          | { type: string };
                        const part = p as unknown as UIInlinePart;
                        if (part.type === "text") {
                          return (
                            <MessageRenderer
                              key={idx}
                              content={
                                (part as { type: "text"; text: string }).text
                              }
                            />
                          );
                        }
                        if (part.type === "image") {
                          const url = (part as { type: "image"; image: string })
                            .image;
                          return (
                            <div key={idx} className="mt-2">
                              <Image
                                src={url}
                                alt="attachment"
                                width={512}
                                height={512}
                                className="rounded-md border h-auto w-full max-h-96 object-contain"
                                unoptimized
                              />
                            </div>
                          );
                        }
                        if (part.type === "file") {
                          const file = (
                            part as {
                              type: "file";
                              file: {
                                name: string;
                                type: string;
                                size: number;
                              };
                            }
                          ).file;
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 mb-2 bg-muted rounded-md border text-sm"
                            >
                              <svg
                                className="w-4 h-4 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <span
                                className="font-medium truncate max-w-xs text-foreground"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({Math.ceil(file.size / 1024)} KB)
                              </span>
                            </div>
                          );
                        }
                        // Handle tool parts - both old format (tool-call/tool-result) and new format (tool-{toolName})
                        if (
                          part.type === "tool-call" ||
                          part.type?.startsWith("tool-")
                        ) {
                          const toolPart = part as {
                            type: string;
                            toolCallId?: string;
                            toolName?: string;
                            args?: Record<string, unknown>;
                            input?: Record<string, unknown>;
                            result?: unknown;
                            output?: unknown;
                            state?: string;
                            invalid?: boolean;
                            error?: unknown;
                          };

                          // Extract tool name from type (tool-{toolName}) or use toolName property
                          const toolName =
                            toolPart.toolName ||
                            (toolPart.type?.startsWith("tool-")
                              ? toolPart.type.replace("tool-", "")
                              : "unknown");

                          const toolCallId = toolPart.toolCallId;
                          if (!toolCallId) return null;

                          // Get result from output or result property
                          const result = toolPart.output || toolPart.result;

                          // CRITICAL FIX #1: Skip rendering tool-call if there's already a tool-result for this toolCallId
                          // This prevents double rendering (one loading, one with results)
                          if (
                            (part.type === "tool-call" ||
                              (part.type?.startsWith("tool-") &&
                                result === undefined)) &&
                            toolResultsSet.has(toolCallId)
                          ) {
                            // Don't render the initial tool-call if result already exists
                            return null;
                          }

                          // CRITICAL FIX #2: Skip invalid tool calls that were marked in first pass
                          // This prevents showing invalid retries when the AI SDK retries with correct parameters
                          if (invalidToolCallIds.has(toolCallId)) {
                            // Check if there's a successful call for this tool name
                            if (successfulToolNames.has(toolName)) {
                              // Skip invalid tool calls that were retried successfully
                              return null;
                            }
                          }

                          // CRITICAL FIX #3: Skip invalid tool calls without results if there's already a successful call for this tool
                          // This catches cases not caught in first pass
                          if (
                            (toolPart.invalid === true || toolPart.error) &&
                            result === undefined &&
                            successfulToolNames.has(toolName)
                          ) {
                            // Skip invalid tool calls that were retried successfully
                            return null;
                          }

                          // Get args from input, args, or toolCallsMap
                          const args =
                            toolPart.input ||
                            toolPart.args ||
                            toolCallsMap.get(toolCallId) ||
                            {};

                          // Determine state based on format
                          let state: "partial-call" | "result" | "call" =
                            "partial-call";
                          if (
                            toolPart.state === "out" ||
                            result !== undefined
                          ) {
                            state = "result";
                          } else if (part.type === "tool-call") {
                            state = "partial-call";
                          }

                          // Debug: Log simulation tool parts with full details
                          if (toolName === "simulate_model") {
                            console.log(
                              "🔍 CHAT: Processing simulation tool part",
                              {
                                type: toolPart.type,
                                toolName,
                                toolCallId,
                                state: toolPart.state,
                                hasResult: !!result,
                                hasArgs: !!args && Object.keys(args).length > 0,
                                allKeys: Object.keys(toolPart),
                                fullPart: toolPart,
                                willRender: !(
                                  (part.type === "tool-call" ||
                                    (part.type?.startsWith("tool-") &&
                                      result === undefined)) &&
                                  toolResultsSet.has(toolCallId)
                                ),
                              }
                            );
                          }

                          return (
                            <ToolCallDisplay
                              key={`${toolCallId}-${state}`}
                              toolName={toolName}
                              toolCallId={toolCallId}
                              args={args}
                              result={result}
                              state={state}
                              onRerunSimulation={handleRerunSimulation}
                            />
                          );
                        }
                        if (part.type === "tool-result") {
                          // Legacy format support
                          const toolResult = part as {
                            type: "tool-result";
                            toolCallId: string;
                            toolName: string;
                            result: unknown;
                            args?: Record<string, unknown>;
                          };
                          // Get args from tool call if not in tool result
                          const args =
                            toolResult.args ||
                            toolCallsMap.get(toolResult.toolCallId) ||
                            {};
                          return (
                            <ToolCallDisplay
                              key={`${toolResult.toolCallId}-result`}
                              toolName={toolResult.toolName}
                              toolCallId={toolResult.toolCallId}
                              args={args}
                              result={toolResult.result}
                              state="result"
                              onRerunSimulation={handleRerunSimulation}
                            />
                          );
                        }
                        return null;
                      });
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Loading indicator when AI is thinking - only show if no assistant message yet */}
          {(status === "streaming" || status === "submitted") &&
            !messages.some((m) => m.role === "assistant") && (
              <div className="flex gap-4 px-4 py-6">
                <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">AI</span>
                </div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
      <div className="border-t bg-background">
        <form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const text = input.trim();
            if (!text && attachments.length === 0) return;
            let currentChatId = chatId;
            let shouldGenerateTitle = false;

            if (!currentChatId) {
              const res = await fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ botId, title: text.slice(0, 60) }),
              });
              const data = (await res.json()) as { id: string };
              currentChatId = data.id;
              chatIdRef.current = currentChatId;
              router.replace(`/app/chat/${botId}?chat=${currentChatId}`);
              shouldGenerateTitle = true;
            } else if (isNewChat) {
              // This is a new chat created via "New Chat" button - generate title
              shouldGenerateTitle = true;
              // Remove the new=true parameter
              router.replace(`/app/chat/${botId}?chat=${currentChatId}`);
            }

            // Generate title if needed
            if (shouldGenerateTitle) {
              try {
                const tRes = await fetch("/api/chats/title", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ botId, prompt: text }),
                });
                if (tRes.ok) {
                  const tData = (await tRes.json()) as { title: string };
                  // update saved chat title
                  await fetch(`/api/chats/${currentChatId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: tData.title }),
                  });
                  router.refresh();
                }
              } catch {}
            }
            const messageParts: Array<
              | { type: "text"; text: string }
              | { type: "image"; image: string }
              | {
                  type: "file";
                  file: {
                    name: string;
                    type: string;
                    size: number;
                    content?: string;
                  };
                }
            > = [];
            if (text) messageParts.push({ type: "text", text });

            // Add file attachments
            for (const a of attachments) {
              if (a.type.startsWith("image/") && a.dataUrl) {
                messageParts.push({ type: "image", image: a.dataUrl });
                continue;
              }

              // For non-image files, send file content to AI but keep separate from user message
              const header = `Attachment: ${a.name} (${a.type || "file"})`;
              const body =
                a.textContent && a.textContent.trim().length > 0
                  ? `\n\n${a.textContent}`
                  : `\n\n[Binary document attached. Name: ${a.name}; MIME: ${a.type}; Size: ${a.size} bytes]. If needed, ask the user for a text version or a public link.`;

              // Store file metadata separately
              messageParts.push({
                type: "file" as const,
                file: {
                  name: a.name,
                  type: a.type,
                  size: a.size,
                  content: `${header}${body}`,
                },
              });
            }

            // Save message with parts
            await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: currentChatId,
                role: "user",
                content: text,
                parts: messageParts, // Save the parts array for rich messages
              }),
            });

            setInput("");
            setAttachments([]);

            await (
              sendMessage as unknown as (arg: {
                content: typeof messageParts;
              }) => Promise<void>
            )({ content: messageParts });
          }}
          className="p-4 max-w-7xl mx-auto w-full flex flex-col gap-2"
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => {
                const isImage = a.type.startsWith("image/");
                if (isImage && a.dataUrl) {
                  return (
                    <Image
                      key={i}
                      src={a.dataUrl}
                      alt={a.name}
                      width={64}
                      height={64}
                      className="rounded border size-16 object-cover"
                      unoptimized
                    />
                  );
                }
                return (
                  <div
                    key={i}
                    className="rounded border px-2 py-1 text-xs bg-muted flex items-center gap-2"
                  >
                    <span
                      className="font-medium truncate max-w-40"
                      title={`${a.name} (${a.type || "file"})`}
                    >
                      {a.name}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.ceil(a.size / 1024)} KB
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <BookOpen className="size-4 text-muted-foreground" />
            <Label htmlFor="mcp-toggle" className="text-sm font-medium">
              ArXiv MCP
            </Label>
            <Switch
              id="mcp-toggle"
              checked={enableMCP}
              onCheckedChange={setEnableMCP}
            />
            <span className="text-xs text-muted-foreground">
              {enableMCP ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <FlaskConical className="size-4 text-muted-foreground" />
            <Label htmlFor="simulation-toggle" className="text-sm font-medium">
              Simulation MCP
            </Label>
            <Switch
              id="simulation-toggle"
              checked={enableSimulation}
              onCheckedChange={setEnableSimulation}
            />
            <span className="text-xs text-muted-foreground">
              {enableSimulation ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (status === "ready") {
                    formRef.current?.requestSubmit();
                  }
                }
              }}
              placeholder="Ask something..."
              className="min-h-8 pr-24 pl-14 rounded-2xl"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Attach image"
              disabled={status !== "ready"}
            >
              <ImageIcon className="size-5" />
            </button>
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              disabled={status !== "ready"}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const readAsDataUrl = (file: File) =>
                  new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.readAsDataURL(file);
                  });
                const readAsText = (file: File) =>
                  new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.readAsText(file);
                  });
                const newItems: {
                  name: string;
                  type: string;
                  size: number;
                  dataUrl?: string;
                  textContent?: string;
                }[] = [];
                for (const f of files) {
                  try {
                    if (f.type.startsWith("image/")) {
                      newItems.push({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        dataUrl: await readAsDataUrl(f),
                      });
                      continue;
                    }
                    if (f.type === "application/pdf") {
                      const arrayBuffer = await f.arrayBuffer();
                      const pdfjs = (await import("pdfjs-dist")) as unknown as {
                        GlobalWorkerOptions?: { workerSrc: string };
                        getDocument: (src: unknown) => {
                          promise: Promise<{
                            numPages: number;
                            getPage: (n: number) => Promise<{
                              getTextContent: () => Promise<{
                                items: Array<{ str?: string }>;
                              }>;
                            }>;
                          }>;
                        };
                      };
                      try {
                        if (pdfjs.GlobalWorkerOptions)
                          pdfjs.GlobalWorkerOptions.workerSrc =
                            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.js";
                      } catch {}
                      const pdf = await pdfjs.getDocument({
                        data: arrayBuffer,
                      }).promise;
                      let text = "";
                      for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const items = content.items as Array<
                          { str?: string } | Record<string, unknown>
                        >;
                        text +=
                          items
                            .map((it) =>
                              "str" in it && typeof it.str === "string"
                                ? it.str
                                : ""
                            )
                            .join(" ") + "\n";
                      }
                      newItems.push({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        textContent: text,
                      });
                      continue;
                    }
                    if (
                      f.type ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    ) {
                      const arrayBuffer = await f.arrayBuffer();
                      const { value } = await mammoth.extractRawText({
                        arrayBuffer,
                      });
                      newItems.push({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        textContent: value,
                      });
                      continue;
                    }
                    if (
                      f.type ===
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                      f.type === "application/vnd.ms-excel"
                    ) {
                      const arrayBuffer = await f.arrayBuffer();
                      const workbook = XLSX.read(arrayBuffer, {
                        type: "array",
                      });
                      const text = workbook.SheetNames.map((name) => {
                        const ws = workbook.Sheets[name];
                        return `${name}\n` + XLSX.utils.sheet_to_csv(ws);
                      }).join("\n");
                      newItems.push({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        textContent: text,
                      });
                      continue;
                    }
                    const isTextLike =
                      f.type.startsWith("text/") ||
                      [
                        "application/json",
                        "application/x-json",
                        "application/csv",
                        "text/csv",
                        "text/markdown",
                        "text/html",
                        "application/xml",
                        "text/xml",
                      ].includes(f.type);
                    if (isTextLike) {
                      const text = await readAsText(f);
                      newItems.push({
                        name: f.name,
                        type: f.type || "text/plain",
                        size: f.size,
                        textContent: text,
                      });
                    } else {
                      // Fallback: store as data URL (binary types like pdf, docx, xlsx)
                      newItems.push({
                        name: f.name,
                        type: f.type || "application/octet-stream",
                        size: f.size,
                        dataUrl: await readAsDataUrl(f),
                      });
                    }
                  } catch {}
                }
                setAttachments((prev) => [...prev, ...newItems]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
