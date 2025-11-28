
import { openrouter } from "@/lib/openrouter";
import { bots, type BotId, defaultBotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import { streamText, type CoreMessage, tool, convertToCoreMessages } from "ai";
import { z } from "zod";
import { arxivTools } from "@/lib/tools/arxiv";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  chatId: z.string().optional(), // Chat ID from the UI
  // Accept UI messages (with parts) or other shapes; we only require role and passthrough the rest
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]) }).passthrough()
  ),
  enableArxiv: z.boolean().optional(), // Kept for backward compat in API, but maps to local arxiv tool
  enableSimulation: z.boolean().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Wrap entire handler in try-catch to prevent ECONNRESET from crashing the app
  try {
    const json = await req.json();
    const {
      botId = defaultBotId,
      chatId: chatIdFromBody,
      messages,
      enableArxiv = false,
      enableSimulation = false,
    } = BodySchema.parse(json);

    // Generate a unique ID for logging this specific request
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`🚀 NEW CHAT REQUEST: ${requestId}`, {
      botId,
      chatId: chatIdFromBody,
      messageCount: messages.length,
      enableArxiv,
      enableSimulation,
    });

    // Prepare messages for the model
    console.log(
      "🔍 Processing messages for core conversion:",
      JSON.stringify(messages, null, 2)
    );
    let coreMessages;
    try {
      coreMessages = convertToCoreMessages(messages as any);
    } catch (err) {
      console.error("❌ Error converting messages to core:", err);
      // Fallback: manual conversion if SDK fails
      coreMessages = messages.map((m: any) => ({
        role: m.role,
        content:
          m.content ||
          (Array.isArray(m.parts)
            ? m.parts.map((p: any) => p.text || "").join("")
            : ""),
      }));
    }

    // System prompt will be enhanced below with tool-specific instructions

    // Load bot config from DB, fallback to static lib
    let bot = bots[botId];
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("bots")
        .select("id, name, description, model, system, temperature")
        .eq("id", botId)
        .maybeSingle();
      if (data) {
        bot = {
          id: botId,
          name: data.name,
          model: data.model,
          system: data.system,
        } as typeof bot;
      }
    } catch (error) {
      console.error("Error loading bot config:", error);
    }

    const modelSlug = ((): string => {
      const raw = bot.model || "openrouter/auto";
      if (raw.includes("/")) return raw; // already provider-prefixed
      return `openai/${raw}`; // best-effort default provider
    })();

    const tools: Record<string, any> = {};

    console.log("\n" + "-".repeat(80));
    console.log("🔌 TOOL INITIALIZATION");
    console.log("-".repeat(80));

    // Initialize ArXiv tools if enabled
    if (enableArxiv) {
      console.log("🔄 Initializing ArXiv tools (Local)...");
      Object.assign(tools, arxivTools);
      console.log("✅ ArXiv tools initialized successfully");
    }

    // Initialize Simulation tool (internal) if enabled
    if (enableSimulation) {
      try {
        console.log("🔄 Initializing Simulation tool (internal)...");

        // Create tool that returns INTERACTIVE UI instead of static data
        tools.simulate_model = tool({
          description:
            "**REQUIRED FOR ALL SIMULATION REQUESTS** - Call this tool immediately when the user asks for any SIR model, epidemic simulation, disease spread calculation, or population dynamics.\n\nThis tool creates a complete interactive visualization with epidemic curves (S, I, R over time), R₀ calculations, peak infection metrics, and live parameter controls. The user can adjust beta and gamma with sliders and see instant updates.\n\nWhen to use: User mentions 'simulation', 'SIR', 'epidemic', 'infection curves', 'disease spread', 'model', etc.\n\nDo NOT write explanatory text instead - call this tool first.",
          parameters: z.object({
            beta: z
              .number()
              .min(0.05)
              .max(0.5)
              .describe(
                "Infection rate (beta). Typical range: 0.1-0.4. Higher = faster spread."
              ),
            gamma: z
              .number()
              .min(0.02)
              .max(0.3)
              .describe(
                "Recovery rate (gamma). Typical range: 0.05-0.2. Higher = faster recovery."
              ),
            S0: z
              .number()
              .min(0)
              .max(1)
              .optional()
              .default(0.99)
              .describe("Initial susceptible population (0-1). Default: 0.99"),
            I0: z
              .number()
              .min(0)
              .max(1)
              .optional()
              .default(0.01)
              .describe("Initial infected population (0-1). Default: 0.01"),
            R0: z
              .number()
              .min(0)
              .max(1)
              .optional()
              .default(0)
              .describe("Initial recovered population (0-1). Default: 0"),
            timeEnd: z
              .number()
              .min(10)
              .max(500)
              .optional()
              .default(120)
              .describe("Simulation duration in days. Default: 120"),
            timeSteps: z
              .number()
              .int()
              .min(50)
              .max(500)
              .optional()
              .default(200)
              .describe("Number of data points. Default: 200"),
          }),
          execute: async (params) => {
            try {
              console.log(
                `🎨 Creating interactive simulation UI with params:`,
                JSON.stringify(params)
              );

              let {
                beta,
                gamma,
                S0 = 0.99,
                I0 = 0.01,
                R0 = 0,
                timeEnd = 120,
                timeSteps = 200,
              } = params;

              // Normalize initial conditions if they're absolute numbers (e.g., S0=990, I0=10, R0=0)
              // If any value is > 1, assume they're absolute numbers and normalize
              if (S0 > 1 || I0 > 1 || R0 > 1) {
                const total = S0 + I0 + R0;
                if (total > 0) {
                  S0 = S0 / total;
                  I0 = I0 / total;
                  R0 = R0 / total;
                  console.log(
                    `📊 Normalized initial conditions: S0=${S0.toFixed(
                      3
                    )}, I0=${I0.toFixed(3)}, R0=${R0.toFixed(3)}`
                  );
                }
              }

              // Validate that S0 + I0 + R0 = 1
              const sum = S0 + I0 + R0;
              if (Math.abs(sum - 1.0) > 0.01) {
                return {
                  status: "error",
                  message: `Initial conditions must sum to 1.0 (got ${sum.toFixed(
                    3
                  )}). Please adjust S0, I0, and R0.`,
                };
              }

              // Calculate R0 for summary
              const r0 = beta / gamma;
              const willSpread = r0 > 1;

              // Return interactive UI configuration
              return {
                _meta: {
                  ui: "interactive_simulation",
                  config: {
                    initialParameters: { beta, gamma },
                    initialState: { S: S0, I: I0, R: R0 },
                    timeEnd,
                    timeSteps,
                  },
                },
                status: "success",
                summary: `Created interactive SIR simulation with β=${beta.toFixed(
                  3
                )}, γ=${gamma.toFixed(3)}, R₀=${r0.toFixed(2)}. The epidemic ${
                  willSpread ? "will spread" : "will die out"
                }. Use the sliders below to explore different scenarios in real-time!`,
              };
            } catch (error) {
              console.error(`❌ Error creating simulation UI:`, error);
              return {
                status: "error",
                message: `Failed to create simulation: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              };
            }
          },
        });

        console.log("✅ Simulation tool initialized successfully (internal)");
      } catch (error) {
        console.error("❌ Failed to initialize Simulation tool:", error);
        // Continue without Simulation tool if initialization fails
      }
    }

    // Enhance system prompt when tools are available
    let systemPrompt = bot.system || "";
    if (Object.keys(tools).length > 0) {
      const toolNames = Object.keys(tools);
      const hasSimulation = toolNames.some((name) => name.includes("simulate"));
      const hasArxiv = toolNames.some(
        (name) =>
          name.includes("arxiv") ||
          name.includes("paper") ||
          name.includes("search")
      );

      // CRITICAL: Force tool usage for simulations
      if (hasSimulation) {
        systemPrompt += `\n\n=== MANDATORY TOOL USAGE FOR SIMULATIONS ===
IMPORTANT: You have a simulation tool available. You MUST use it for ANY simulation request.

When a user requests:
- SIR model, epidemic simulation, disease spread
- Any mathematical model simulation
- Infection curves, population dynamics

YOU MUST:
1. Immediately call simulate_model tool with extracted parameters
2. Do NOT generate explanatory text first
3. Do NOT try to explain how you'll do it - just call the tool
4. The tool creates a complete interactive visualization automatically

Parameters to extract:
- beta: infection rate (0.1-0.4, default 0.25)
- gamma: recovery rate (0.05-0.2, default 0.1)  
- S0, I0, R0: initial conditions (must sum to 1.0)
- timeEnd: days (default 120)
- timeSteps: data points (default 200)

Example request: "Run a 120-day SIR simulation with S0=990, I0=10, R0=0, beta=0.25, gamma=0.1"
Correct response: [Call simulate_model immediately with normalized parameters]
Wrong response: Explaining what you'll do before calling the tool

The tool returns an interactive UI - you can briefly introduce it after the tool completes.`;
      }

      if (hasArxiv) {
        systemPrompt += `\n\nYou have access to an ArXiv search tool for finding research papers.`;
      }

      systemPrompt += `\n\nAlways use tools when appropriate - they provide better results than text generation.`;
    }

    // Determine if we should require tool usage
    // For simulation requests, we want to encourage tool usage but not force it
    // (forcing can cause issues if the model doesn't understand the request)
    const shouldPreferTools = enableSimulation && Object.keys(tools).length > 0;

    console.log("🎯 Model Configuration:", {
      model: modelSlug,
      hasTools: Object.keys(tools).length > 0,
      toolNames: Object.keys(tools),
      toolChoice: shouldPreferTools ? "auto" : undefined,
      maxSteps: 5,
    });

    // Call streamText (V3)
    const result = await streamText({
      model: openrouter(modelSlug),
      system: systemPrompt,
      messages: coreMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      toolChoice: shouldPreferTools ? "auto" : undefined, // Let model decide, but with strong system prompt
      maxSteps: 5, // V3 uses maxSteps directly
      temperature: ((): number | undefined => {
        const maybe = (bot as unknown as { temperature?: unknown }).temperature;
        return typeof maybe === "number" ? maybe : undefined;
      })(),
      onFinish: async (event) => {
        console.log("\n🔄 Generation Finished");
        console.log("   Finish Reason:", event.finishReason);
        console.log("   Text Length:", event.text?.length || 0);
        console.log("   Tool Calls:", event.toolCalls?.length || 0);
        console.log("   Tool Results:", event.toolResults?.length || 0);

        if (event.toolCalls && event.toolCalls.length > 0) {
          console.log("   📞 Tool Calls Details:");
          event.toolCalls.forEach((tc: any, idx: number) => {
            console.log(
              `      ${idx + 1}. ${tc.toolName}:`,
              JSON.stringify(tc.args).slice(0, 200)
            );
          });
        }

        if (event.toolResults && event.toolResults.length > 0) {
          console.log("   📦 Tool Results Details:");
          event.toolResults.forEach((tr: any, idx: number) => {
            console.log(
              `      ${idx + 1}. ${tr.toolName}:`,
              JSON.stringify(tr.result).slice(0, 200)
            );
          });
        }

        // Check if steps are present (for multi-step tool calls)
        if (event.steps && event.steps.length > 0) {
          console.log("   🪜 Steps:", event.steps.length);
          event.steps.forEach((step: any, idx: number) => {
            console.log(`      Step ${idx + 1}:`, {
              toolCalls: step.toolCalls?.length || 0,
              toolResults: step.toolResults?.length || 0,
              text: step.text?.slice(0, 100) || "",
            });

            // Log actual tool results for debugging
            if (step.toolResults && step.toolResults.length > 0) {
              console.log(`      Step ${idx + 1} Tool Results:`);
              step.toolResults.forEach((tr: any, trIdx: number) => {
                console.log(`         ${trIdx + 1}. ${tr.toolName}:`, {
                  resultKeys: tr.result ? Object.keys(tr.result) : null,
                  result: JSON.stringify(tr.result).slice(0, 300),
                });
              });
            }
          });
        }
      },
    });

    // For DefaultChatTransport, return the data stream response
    // This includes tool calls and results in the message parts automatically
    return result.toDataStreamResponse();
  } catch (error) {
    // Catch any unhandled errors (including ECONNRESET) to prevent app crash
    const errorCode = (error as { code?: string })?.code;
    const errorName = error instanceof Error ? error.name : "";
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Silently ignore ECONNRESET and AbortError - these are expected when clients disconnect
    if (
      errorName === "AbortError" ||
      errorCode === "ECONNRESET" ||
      errorCode?.includes("ECONNRESET") ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("aborted")
    ) {
      console.log("🔌 Connection reset (client disconnected) - ignoring");
      // Return an empty response to prevent crashes
      return new Response("", { status: 200 });
    }

    // Log other errors but don't crash
    console.error("❌ Unexpected error in chat route:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

