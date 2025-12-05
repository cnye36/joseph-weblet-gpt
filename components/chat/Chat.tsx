"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {Message, useChat } from "ai/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import MessageRenderer from "./MessageRenderer";
import SimulationRenderer from "./SimulationRenderer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { buildMermaidFromChartData } from "@/lib/chart-data";
import { ChartToolConfig } from "@/lib/chart-schemas";
import { ChartToolRenderer } from "./ChartToolRenderer";

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

  const isNewChat = searchParams.get("new") === "true";
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Custom fetch that injects current botId and chatId
  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const originalBody = init?.body ? JSON.parse(init.body as string) : {};
      const enhancedBody = {
        ...originalBody,
        botId,
        chatId: chatIdRef.current,
      };

      return fetch(input, {
        ...init,
        body: JSON.stringify(enhancedBody),
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
        },
      });
    },
    [botId]
  );



  const [enableSimulation, setEnableSimulation] = useState(false);
  const [enableArxiv, setEnableArxiv] = useState(false);

  const {
    messages,
    isLoading,
    setMessages,
    append,
    input,
    handleInputChange,
    setInput,
    error,
    reload,
  } = useChat({
    api: "/api/chat",
    body: {
      botId,
      chatId: chatIdRef.current,
      chatId: chatIdRef.current,
      enableSimulation,
      enableArxiv,
    },
    fetch: customFetch,
    onFinish: async (message) => {
      const finishedChatId = chatIdRef.current;
      if (finishedChatId) {
        // Cast to unknown first to access parts safely
        const msg = message as unknown as {
          parts?: unknown[];
          content?: string;
          role: string;
        };

        let text = "";
        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.parts)) {
          text = msg.parts
            .filter((p): p is { type: "text"; text: string } => 
              typeof p === "object" && p !== null && "type" in p && p.type === "text"
            )
            .map((p) => p.text)
            .join("");
        }

        const payload: {
          chatId: string;
          role: string;
          content: string;
          parts?: unknown[];
        } = {
          chatId: finishedChatId,
          role: "assistant",
          content: text,
        };

        if (Array.isArray(msg.parts) && msg.parts.length > 0) {
          payload.parts = msg.parts;
        }

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    },
  });

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

  // Track if we've loaded messages for this chat
  const loadedChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        loadedChatIdRef.current !== null &&
        loadedChatIdRef.current !== chatId
      ) {
        setMessages([]);
        loadedChatIdRef.current = null;
      }

      if (!chatId) {
        setMessages([]);
        loadedChatIdRef.current = null;
        return;
      }

      if (loadedChatIdRef.current === chatId) return;

      const res = await fetch(`/api/messages?chatId=${chatId}`);
      if (!res.ok) {
        loadedChatIdRef.current = chatId;
        return;
      }

      const data = (await res.json()) as {
        messages: {
          role: Message["role"];
          content: string;
          parts?: unknown[];
        }[];
      };

      setMessages(
        data.messages.map((m, i) => ({
          id: String(i),
          role: m.role,
          content: m.content,
          parts: m.parts || [{ type: "text", text: m.content }],
        })) as Message[]
      );

      loadedChatIdRef.current = chatId;
    })();
  }, [chatId, setMessages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments([
            ...attachments,
            {
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: e.target?.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8">
              <h2 className="text-3xl font-bold tracking-tight">
                Hello there!
              </h2>
              <p className="text-muted-foreground text-lg">
                How can I help you today?
              </p>
            </div>
          ) : (
            messages.map((m: Message) => {
              const hasToolResult = m.parts?.some((p) => {
                if (typeof p === "object" && p !== null && "type" in p) {
                  return (
                    p.type === "tool-invocation" &&
                    "toolInvocation" in p &&
                    typeof p.toolInvocation === "object" &&
                    p.toolInvocation !== null &&
                    "toolName" in p.toolInvocation &&
                    (p.toolInvocation.toolName === "simulate_model" ||
                      p.toolInvocation.toolName === "generate_chart" ||
                      p.toolInvocation.toolName === "arxiv_search_papers" ||
                      p.toolInvocation.toolName === "arxiv_get_paper_details")
                  );
                }
                return false;
              });

              return (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`space-y-1 rounded-lg ${
                      m.role === "user"
                        ? "bg-blue-600 text-white max-w-[80%] px-4 py-3"
                        : `bg-muted px-4 py-3 ${
                            hasToolResult ? "max-w-full w-full" : "max-w-[80%]"
                          }`
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1 capitalize">
                      {m.role}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed break-words">
                      <MessageRenderer content={m.content} />
                      {m.parts?.map((part, idx) => {
                        // Type guard for tool invocation parts
                        if (
                          typeof part === "object" &&
                          part !== null &&
                          "type" in part &&
                          part.type === "tool-invocation" &&
                          "toolInvocation" in part &&
                          typeof part.toolInvocation === "object" &&
                          part.toolInvocation !== null
                        ) {
                          const toolInv = part.toolInvocation as {
                            toolName?: string;
                            toolCallId?: string;
                            state?: string;
                            result?: Record<string, unknown>;
                          };

                          const { toolName, toolCallId, state } = toolInv;

                          if (toolName === "simulate_model") {
                            const result = state === "result" ? toolInv.result : undefined;

                            if (state === "result" && result && "config" in result && "status" in result) {
                               return (
                                <div key={toolCallId || idx} className="mt-4">
                                  <SimulationRenderer
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    initialConfig={result.config as any}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    initialResult={result as any}
                                  />
                                </div>
                              );
                            }

                            return (
                              <div
                                key={toolCallId || idx}
                                className="mt-2 text-xs text-muted-foreground flex items-center gap-2"
                              >
                                <div className="size-3 rounded-full bg-primary/50 animate-pulse" />
                                Running simulation...
                              </div>
                            );
                          }

                          if (toolName === "generate_chart") {
                            const result = state === "result" ? toolInv.result : undefined;

                            if (state === "result" && result) {
                              return (
                                <div key={toolCallId || idx} className="mt-4 w-full">
                                  <ChartToolRenderer config={result as unknown as ChartToolConfig} />
                                </div>
                              );
                            }

                            return (
                              <div
                                key={toolCallId || idx}
                                className="mt-2 text-xs text-muted-foreground flex items-center gap-2"
                              >
                                <div className="size-3 rounded-full bg-primary/50 animate-pulse" />
                                Generating chart...
                              </div>
                            );
                          }

                          if (toolName === "arxiv_search_papers" || toolName === "arxiv_get_paper_details") {
                            const result = state === "result" ? toolInv.result : undefined;
                            
                            if (state === "result" && result) {
                              // For now, we'll let the text response handle the display of arxiv results
                              // or we could add a custom renderer later.
                              // The tool returns data that the LLM uses to generate a response.
                              return null; 
                            }

                            return (
                              <div
                                key={toolCallId || idx}
                                className="mt-2 text-xs text-muted-foreground flex items-center gap-2"
                              >
                                <div className="size-3 rounded-full bg-primary/50 animate-pulse" />
                                Searching ArXiv...
                              </div>
                            );
                          }

                          
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && !messages.some((m) => m.role === "assistant") && (
            <div className="flex gap-4 px-4 py-6">
              <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">AI</span>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="border-t bg-background flex-shrink-0 p-4">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  {att.dataUrl && (
                    <Image
                      src={att.dataUrl}
                      alt={att.name}
                      width={64}
                      height={64}
                      className="rounded-md border object-cover size-16"
                    />
                  )}
                  <button
                    onClick={() => {
                      const newAtts = [...attachments];
                      newAtts.splice(idx, 1);
                      setAttachments(newAtts);
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-start gap-4 mb-2 px-1">
            <div className="flex items-center gap-2">
              <Switch
                id="simulation-mode"
                checked={enableSimulation}
                onCheckedChange={setEnableSimulation}
              />
              <Label
                htmlFor="simulation-mode"
                className="text-xs text-muted-foreground font-medium cursor-pointer"
              >
                Run Simulation
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="arxiv-mode"
                checked={enableArxiv}
                onCheckedChange={setEnableArxiv}
              />
              <Label
                htmlFor="arxiv-mode"
                className="text-xs text-muted-foreground font-medium cursor-pointer"
              >
                Search Arxiv
              </Label>
            </div>
          </div>

          {error && (
            <div className="mb-2 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between gap-2">
              <span>{error.message}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => reload()}
                className="h-7 text-xs border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                Retry
              </Button>
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!input.trim() && attachments.length === 0) return;

              let currentChatId = chatId;
              let shouldGenerateTitle = false;

              if (!currentChatId) {
                const res = await fetch("/api/chats", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ botId, title: input.slice(0, 60) }),
                });
                const data = (await res.json()) as { id: string };
                currentChatId = data.id;
                chatIdRef.current = currentChatId;
                router.replace(`/app/chat/${botId}?chat=${currentChatId}`);
                shouldGenerateTitle = true;
              } else if (isNewChat) {
                shouldGenerateTitle = true;
                router.replace(`/app/chat/${botId}?chat=${currentChatId}`);
              }

              if (shouldGenerateTitle) {
                fetch("/api/chats/title", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ botId, prompt: input }),
                }).then(async (tRes) => {
                  if (tRes.ok) {
                    await fetch(`/api/chats/${currentChatId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: (await tRes.json()).title,
                      }),
                    });
                    router.refresh();
                  }
                });
              }

              // Build message parts for text and images
              const messageParts: Array<
                | { type: "text"; text: string }
                | { type: "image"; image: string }
              > = [{ type: "text", text: input }];

              // Add attachments if any
              for (const att of attachments) {
                if (att.type.startsWith("image/") && att.dataUrl) {
                  messageParts.push({
                    type: "image",
                    image: att.dataUrl,
                  });
                }
              }

              // Save user message to DB
              if (currentChatId) {
                await fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chatId: currentChatId,
                    role: "user",
                    content: input,
                    parts: messageParts,
                  }),
                });
              }

              await append({
                role: "user",
                content: input,
                // Parts type is complex in AI SDK, using compatible format
                parts: messageParts as never,
              });

              setInput("");
              setAttachments([]);
            }}
            className="relative flex items-end gap-2 bg-muted/50 p-2 rounded-xl border focus-within:ring-1 focus-within:ring-ring"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="size-5" />
            </Button>
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="min-h-[20px] max-h-[200px] border-0 shadow-none focus-visible:ring-0 resize-none bg-transparent py-3"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
            />
            <Button type="submit" size="icon" className="shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
