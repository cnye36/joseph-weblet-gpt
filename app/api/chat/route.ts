
import { openrouter } from "@/lib/openrouter";
import { bots, type BotId, defaultBotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import {
  streamText,
  type CoreMessage,
  tool,
  convertToCoreMessages,
} from "ai";
import { z } from "zod";
import {
  runSimulation,
  type SimulationSpec,
} from "@/lib/simulation-tool";
import { arxivTools } from "@/lib/tools/arxiv";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  // Accept UI messages (with parts) or other shapes; we only require role and passthrough the rest
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]) }).passthrough()
  ),
  enableMCP: z.boolean().optional(), // Kept for backward compat in API, but maps to local arxiv tool
  enableSimulation: z.boolean().optional(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Wrap entire handler in try-catch to prevent ECONNRESET from crashing the app
  try {
    const json = await req.json();
    const {
      botId = defaultBotId,
      messages,
      enableMCP = false,
      enableSimulation = false,
    } = BodySchema.parse(json);

    // Generate a unique ID for the chat request for logging
    const chatId = Math.random().toString(36).substring(2, 10);
    console.log(`🚀 NEW CHAT REQUEST: ${chatId}`);

    // Prepare messages for the model
    console.log("🔍 Processing messages for core conversion:", JSON.stringify(messages, null, 2));
    let coreMessages;
    try {
      coreMessages = convertToCoreMessages(messages as any);
    } catch (err) {
      console.error("❌ Error converting messages to core:", err);
      // Fallback: manual conversion if SDK fails
      coreMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content || (Array.isArray(m.parts) ? m.parts.map((p: any) => p.text || "").join("") : "")
      }));
    }

    // Add system prompt
    const systemMessage: CoreMessage = {
      role: "system",
      content: `You are a helpful assistant.

=== TOOL USAGE ===
You have access to a simulation tool. USE IT when asked to run simulations.
Do not generate fake data.
Always explain the results of the simulation after running it.
`,
    };

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

    // Initialize ArXiv tools if enabled (replacing MCP)
    if (enableMCP) {
      console.log("🔄 Initializing ArXiv tools (Local)...");
      Object.assign(tools, arxivTools);
      console.log("✅ ArXiv tools initialized successfully");
    }

    // Initialize Simulation tool (internal) if enabled
    if (enableSimulation) {
      try {
        console.log("🔄 Initializing Simulation tool (internal)...");

        // Create tool that calls internal simulation logic
        tools.simulate_model = tool({
          description:
            "Run a simulation described by a structured JSON spec and return artifacts + metrics.\n\nFeatures:\n- Returns actual data points for interactive visualization (set return_data=True)\n- Preview mode for faster rendering with fewer data points (set time_span.preview_mode=True)\n- Optional artifact saving (set save_artifacts=False for faster response)",
          parameters: z.object({
            spec: z.object({
              domain: z
                .literal("epidemiology")
                .describe(
                  "Must be 'epidemiology' (only SIR model is implemented)."
                ),
              model_type: z
                .literal("SIR")
                .describe("Must be 'SIR' (only implemented model)."),
              parameters: z
                .record(z.string(), z.number())
                .describe(
                  "SIR model parameters. REQUIRED: { beta: 0.1-0.5 (infection/change rate), gamma: 0.05-0.2 (recovery/stability rate) }."
                ),
              initial_conditions: z
                .record(z.string(), z.number())
                .describe(
                  "Initial state values. REQUIRED: { S: 0.99, I: 0.01, R: 0 } (must sum to 1.0)."
                ),
              time_span: z
                .object({
                  start: z.number().describe("Start time"),
                  end: z.number().describe("End time"),
                  steps: z
                    .number()
                    .int()
                    .gte(2)
                    .optional()
                    .describe("Number of data points (default: 400)"),
                  preview_mode: z
                    .boolean()
                    .optional()
                    .describe(
                      "Fast preview with max 100 points (default: false)"
                    ),
                })
                .describe("Time grid definition."),
              method: z
                .enum(["RK45", "RK23", "DOP853"])
                .optional()
                .describe("ODE solver method (default: RK45)"),
              return_data: z
                .boolean()
                .optional()
                .describe(
                  "Whether to return full time-series data (default: true)"
                ),
              save_artifacts: z
                .boolean()
                .optional()
                .describe(
                  "Whether to save CSV/PNG artifacts on server (default: false)"
                ),
              sensitivity: z
                .record(z.string(), z.number())
                .optional()
                .describe(
                  "Optional sensitivity analysis; e.g. { beta: 0.05 } for ±5%"
                ),
              tags: z
                .array(z.string())
                .optional()
                .describe("Optional list of tags/labels for this run"),
            }),
          }),
          execute: async ({ spec }: { spec: SimulationSpec }) => {
            try {
              console.log(
                `🔧 Executing simulate_model tool with spec:`,
                JSON.stringify(spec).slice(0, 200)
              );

              // Call internal simulation logic
              const result = await runSimulation(spec);

              console.log(`✅ simulate_model tool execution completed`);

              // Return result in format UI expects (with _meta wrapper for compatibility)
              // The UI component handles both _meta.result format and direct format
              return {
                _meta: {
                  result: {
                    status: result.status,
                    message: result.message,
                    data: result.data,
                    metrics: result.metrics,
                    summary: result.summary,
                    columns: result.columns,
                  },
                },
              };
            } catch (error) {
              console.error(`❌ Error executing simulate_model tool:`, error);
              throw error;
            }
          },
        });

        console.log(
          "✅ Simulation tool initialized successfully (internal)"
        );
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

      if (hasSimulation && hasArxiv) {
        systemPrompt += `\n\nYou have access to a simulation tool and an ArXiv search tool.`;
      } else if (hasSimulation) {
        systemPrompt += `\n\nYou have access to a simulation tool.`;
      } else if (hasArxiv) {
        systemPrompt += `\n\nYou have access to an ArXiv search tool.`;
      }
      systemPrompt += `\nUse them when appropriate.`;
    }

    // Call streamText (V3)
    const result = await streamText({
      model: openrouter(modelSlug),
      system: systemPrompt,
      messages: coreMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: 5, // V3 uses maxSteps directly
      temperature: ((): number | undefined => {
        const maybe = (bot as unknown as { temperature?: unknown }).temperature;
        return typeof maybe === "number" ? maybe : undefined;
      })(),
      onFinish: async (event) => {
        console.log("🔄 Generation Finished");
        console.log("   Finish Reason:", event.finishReason);
        console.log("   Text Length:", event.text?.length || 0);
        console.log("   Tool Calls:", event.toolCalls?.length || 0);
        console.log("   Tool Results:", event.toolResults?.length || 0);
        console.log("   Full Event Keys:", Object.keys(event));
        console.log("   Full Event:", JSON.stringify(event, null, 2).slice(0, 1000));
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

