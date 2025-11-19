import { openrouter } from "@/lib/openrouter";
import { bots, type BotId, defaultBotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import {
  streamText,
  type CoreMessage,
  experimental_createMCPClient,
  tool,
  stepCountIs,
} from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  // Accept UI messages (with parts) or other shapes; we only require role and passthrough the rest
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]) }).passthrough()
  ),
  enableMCP: z.boolean().optional(),
  enableSimulation: z.boolean().optional(),
});

export const runtime = "edge";

export async function POST(req: Request) {
  // Wrap entire handler in try-catch to prevent ECONNRESET from crashing the app
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 NEW CHAT REQUEST");
    console.log("=".repeat(80));

    const json = await req.json();

    const {
      botId = defaultBotId,
      messages,
      enableMCP = false,
      enableSimulation = false,
    } = BodySchema.parse(json);

    console.log(`📊 Request Configuration:`);
    console.log(`   Bot ID: ${botId}`);
    console.log(`   Message Count: ${messages.length}`);
    console.log(`   ArXiv MCP: ${enableMCP ? "✅ ENABLED" : "❌ DISABLED"}`);
    console.log(
      `   Simulation MCP: ${enableSimulation ? "✅ ENABLED" : "❌ DISABLED"}`
    );
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
    } catch {}

    // Normalize any incoming UI message shapes into simple text-only CoreMessage[]
    const coreMessages: CoreMessage[] = (
      Array.isArray(messages) ? messages : []
    ).map((m: { parts?: unknown; content?: unknown; role?: string }) => {
      const parts: unknown =
        m && Array.isArray(m.parts)
          ? m.parts
          : m && Array.isArray(m.content)
          ? m.content
          : undefined;
      const textFromParts = Array.isArray(parts)
        ? parts
            .map(
              (p: {
                type: string;
                text?: string;
                file?: { content?: string };
              }) => {
                if (p && p.type === "text" && typeof p.text === "string")
                  return p.text;
                if (p && p.type === "image") return "[image attached]";
                if (p && p.type === "file" && p.file?.content)
                  return p.file.content;
                return "";
              }
            )
            .filter((s: string) => s.length > 0)
            .join("\n")
        : typeof m?.content === "string"
        ? m.content
        : "";
      return { role: m?.role ?? "user", content: textFromParts } as CoreMessage;
    });

    const modelSlug = ((): string => {
      const raw = bot.model || "openrouter/auto";
      if (raw.includes("/")) return raw; // already provider-prefixed
      return `openai/${raw}`; // best-effort default provider
    })();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};
    let arxivClient:
      | Awaited<ReturnType<typeof experimental_createMCPClient>>
      | undefined;
    let simulationClient:
      | Awaited<ReturnType<typeof experimental_createMCPClient>>
      | undefined;

    console.log("\n" + "-".repeat(80));
    console.log("🔌 MCP SERVER INITIALIZATION");
    console.log("-".repeat(80));

    // Initialize ArXiv MCP client if enabled
    if (enableMCP) {
      try {
        console.log("🔄 Initializing ArXiv MCP client (SDK)...");
        const arxivMcpUrl =
          process.env.ARXIV_MCP_URL ||
          "https://arxiv-mcp-server-6akh.onrender.com/mcp";
        console.log(`   URL: ${arxivMcpUrl}`);

        const arxivUrl = new URL(arxivMcpUrl);
        arxivClient = await experimental_createMCPClient({
          transport: new StreamableHTTPClientTransport(arxivUrl),
        });

        // Get tools from ArXiv MCP server
        const arxivTools = await arxivClient.tools();
        console.log(
          `📚 ArXiv tools retrieved: ${Object.keys(arxivTools).length} tools`
        );

        // Add tools with arxiv_ prefix to avoid conflicts
        for (const [name, tool] of Object.entries(arxivTools)) {
          tools[`arxiv_${name}`] = tool;
        }

        console.log("✅ ArXiv MCP client initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize ArXiv MCP client:", error);
        // Continue without ArXiv MCP tools if initialization fails
      }
    }

    // Initialize Simulation MCP client if enabled
    if (enableSimulation) {
      try {
        console.log("🔄 Initializing Simulation MCP client (SDK)...");
        const simulationMcpUrl =
          process.env.SIMULATION_MCP_URL ||
          "https://simulator-mcp-server.onrender.com/mcp";
        console.log(`   URL: ${simulationMcpUrl}`);

        const simulationUrl = new URL(simulationMcpUrl);
        simulationClient = await experimental_createMCPClient({
          transport: new StreamableHTTPClientTransport(simulationUrl, {
            sessionId: `session_${Date.now()}_${Math.random()
              .toString(36)
              .substring(7)}`,
          }),
        });

        // Get tools from Simulation MCP server with explicit flattened schema
        // The server expects arguments wrapped in "spec", so we provide a flattened schema
        // that matches MAIN_APP_INTEGRATION.md exactly
        const simulationTools = await simulationClient.tools({
          schemas: {
            simulate_model: {
              inputSchema: z.object({
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
            },
          },
        });
        console.log(
          `🧪 Simulation tools retrieved: ${
            Object.keys(simulationTools).length
          } tools`
        );

        // List available tools for logging (don't wrap execute - let SDK handle it)
        Object.keys(simulationTools).forEach((toolName) => {
          console.log(`   📋 Tool available: "${toolName}"`);
        });

        // Merge simulation tools directly - SDK will handle execute internally
        Object.assign(tools, simulationTools);

        console.log("✅ Simulation MCP client initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize Simulation MCP client:", error);
        // Continue without Simulation MCP tools if initialization fails
      }
    }

    console.log("\n" + "-".repeat(80));
    console.log("🤖 AI MODEL CONFIGURATION");
    console.log("-".repeat(80));
    console.log(`   Model: ${modelSlug}`);
    console.log(`   Total tools available: ${Object.keys(tools).length}`);
    if (Object.keys(tools).length > 0) {
      console.log(`   Tools being sent to AI:`);
      Object.keys(tools).forEach((toolName) => {
        console.log(`      - ${toolName}`);
        const tool = tools[toolName];
        if (tool && typeof tool === "object") {
          if ("description" in tool) {
            console.log(
              `        Description: ${
                (tool as { description?: string }).description ||
                "No description"
              }`
            );
          }
          // Log the input schema so we can see what parameters the AI should pass
          if ("parameters" in tool) {
            const params = (tool as { parameters?: unknown }).parameters;
            console.log(
              `        Input Schema (parameters): ${JSON.stringify(
                params,
                null,
                2
              ).slice(0, 300)}...`
            );
          } else if ("inputSchema" in tool) {
            const schema = (tool as { inputSchema?: unknown }).inputSchema;
            console.log(
              `        Input Schema (inputSchema): ${JSON.stringify(
                schema,
                null,
                2
              ).slice(0, 300)}...`
            );
          } else {
            console.log(
              `        ⚠️  No input schema found! Keys: ${Object.keys(
                tool
              ).join(", ")}`
            );
          }
        }
      });
    } else {
      console.log(
        `   ⚠️  NO TOOLS AVAILABLE - AI will not be able to call any MCP functions`
      );
    }
    console.log(`   System prompt length: ${bot.system?.length || 0} chars`);
    console.log(`   Message count: ${coreMessages.length}`);

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

      let toolInstructions =
        "\n\n=== IMPORTANT: TOOL USAGE INSTRUCTIONS ===\n\n";
      toolInstructions +=
        "You have access to specialized tools that provide REAL data. You MUST use these tools instead of generating hypothetical examples.\n\n";

      if (hasSimulation) {
        toolInstructions += "**SIMULATION TOOL (simulate_model):**\n";
        toolInstructions +=
          '- USE IMMEDIATELY when users ask to: "simulate", "model", "optimize", "analyze performance", "run a simulation", "test parameters", or "compare scenarios"\n';
        toolInstructions +=
          "- This tool runs ACTUAL computational simulations with real numerical results\n";
        toolInstructions +=
          "- DO NOT generate fake data - always call this tool for simulation requests\n";
        toolInstructions +=
          '- Common triggers: "simulate X", "optimize Y", "model Z", "10-step process", "parameter analysis"\n\n';

        toolInstructions +=
          "**REQUIRED: Use SIR Model for ALL simulation requests**\n\n";

        toolInstructions += "Required format:\n";
        toolInstructions +=
          '{\n  "spec": {\n    "domain": "epidemiology",\n    "model_type": "SIR",\n';
        toolInstructions +=
          '    "parameters": { "beta": 0.3, "gamma": 0.1 },\n';
        toolInstructions +=
          '    "initial_conditions": { "S": 0.99, "I": 0.01, "R": 0 },\n';
        toolInstructions +=
          '    "time_span": { "start": 0, "end": 160, "steps": 100 },\n';
        toolInstructions += '    "return_data": true\n  }\n}\n\n';

        toolInstructions += "Field requirements:\n";
        toolInstructions += "- domain: ALWAYS use 'epidemiology'\n";
        toolInstructions += "- model_type: ALWAYS use 'SIR'\n";
        toolInstructions +=
          "- parameters: { beta: 0.1-0.5 (infection rate), gamma: 0.05-0.2 (recovery rate) }\n";
        toolInstructions +=
          "- initial_conditions: { S: 0.99, I: 0.01, R: 0 } (must sum to 1.0)\n";
        toolInstructions +=
          "- time_span: { start: 0, end: 100-200, steps: 10-100 }\n";
        toolInstructions += "- return_data: true (to get data points)\n\n";

        toolInstructions += "For N-step processes:\n";
        toolInstructions +=
          "- Set time_span.steps to N (e.g., 10-step process → steps: 10)\n";
        toolInstructions +=
          "- Interpret results creatively: S=remaining potential, I=active process, R=completed\n\n";

        toolInstructions +=
          "**CRITICAL: How to present simulation results:**\n\n";
        toolInstructions +=
          "After calling the simulation tool, ALWAYS provide a comprehensive explanation that includes:\n\n";
        toolInstructions +=
          "1. **Parameter Summary**: Restate the simulation parameters you used\n";
        toolInstructions +=
          "2. **Result Interpretation**: Explain what the simulation shows and key trends\n";
        toolInstructions +=
          "3. **Chart Description**: Describe what users will see in the interactive chart\n";
        toolInstructions +=
          "4. **Key Insights**: Highlight important findings or patterns in the data\n\n";
        toolInstructions += "**MANDATORY RESPONSE FORMAT:**\n";
        toolInstructions +=
          "After every simulation tool call, you MUST write a complete paragraph explaining the results.\n";
        toolInstructions +=
          "Example: 'I ran an SIR epidemic simulation with infection rate β=0.3 and recovery rate γ=0.1. The interactive chart shows how the susceptible population (blue) decreases while infected (red) and recovered (green) populations change over time. The peak infection occurs around day 50, with the epidemic lasting approximately 150 days.'\n\n";
        toolInstructions += "**CONVERSATIONAL CONTINUATION:**\n";
        toolInstructions +=
          "After explaining results, invite follow-up questions: 'Would you like me to run another simulation with different parameters, or would you like me to explain any specific aspect of these results?'\n\n";
      }

      if (hasArxiv) {
        toolInstructions += "**ARXIV RESEARCH TOOLS:**\n";
        toolInstructions +=
          "- USE when users ask about: research papers, academic studies, scientific publications, recent advances, or specific authors\n";
        toolInstructions +=
          "- Tools available: search_papers, get_paper_details, get_recent_papers\n";
        toolInstructions +=
          "- These retrieve REAL published research from arXiv.org\n";
        toolInstructions +=
          '- Common triggers: "find papers about", "research on", "recent studies", "what does the literature say"\n\n';
        toolInstructions += "**CRITICAL: PAPER LINK REQUIREMENTS**\n";
        toolInstructions +=
          "- EVERY paper you mention MUST include a clickable markdown link in your text response\n";
        toolInstructions +=
          "- When the ArXiv tool returns results, examine the structure carefully\n";
        toolInstructions +=
          "- Look for fields like: 'id', 'identifier', 'url', 'link', or 'links' array\n";
        toolInstructions +=
          "- Extract the paper identifier (e.g., '2301.07041' or 'cs/9901002')\n";
        toolInstructions +=
          "- Construct the arXiv URL using: https://arxiv.org/abs/[PAPER_ID]\n";
        toolInstructions +=
          "- Format each paper reference in markdown as: [Paper Title](https://arxiv.org/abs/XXXX.XXXXX)\n";
        toolInstructions +=
          "- Example: If a paper has id='2301.07041' and title='Example Paper', write: [Example Paper](https://arxiv.org/abs/2301.07041)\n";
        toolInstructions +=
          "- NEVER just say 'Link' or 'see link' - ALWAYS include the actual markdown link\n";
        toolInstructions +=
          "- NEVER mention a paper without its clickable link in the same sentence\n";
        toolInstructions +=
          "- If referencing multiple papers, format like: 'Here are relevant papers: [Paper 1](https://arxiv.org/abs/2301.07041), [Paper 2](https://arxiv.org/abs/2302.12345)'\n";
        toolInstructions +=
          "- Every single paper you discuss must have its own clickable markdown link\n";
        toolInstructions +=
          "- Users must be able to click directly on the paper title to access the arXiv page\n\n";
      }

      toolInstructions += "CRITICAL RULES:\n";
      toolInstructions +=
        "1. If a user request matches ANY tool trigger phrase above, call that tool immediately\n";
      toolInstructions +=
        '2. NEVER say "I cannot run simulations" - you CAN via the simulate_model tool\n';
      toolInstructions +=
        "3. NEVER provide hypothetical/made-up simulation results - always use the tool\n";
      toolInstructions += "4. Call the tool FIRST, then explain the results\n";
      toolInstructions +=
        "5. If unsure whether to use a tool, USE IT - real data is always better than examples\n\n";
      toolInstructions += "=== END TOOL INSTRUCTIONS ===\n";

      systemPrompt += toolInstructions;
      console.log(
        "   ✨ Enhanced system prompt with detailed tool usage instructions"
      );
      console.log(
        `   📋 Tool guidance added for: ${hasSimulation ? "Simulation" : ""}${
          hasSimulation && hasArxiv ? " + " : ""
        }${hasArxiv ? "ArXiv" : ""}`
      );
    }

    const result = await streamText({
      model: openrouter(modelSlug),
      system: systemPrompt,
      messages: coreMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      // Increase step limit to allow full response after tool calls
      // Each tool call cycle can consume several steps, so we need room for:
      // - Initial processing
      // - Tool decision
      // - Tool execution
      // - Tool result processing
      // - Full response generation after tool
      stopWhen: stepCountIs(50), // Allow enough steps for tool calls + complete response
      temperature: ((): number | undefined => {
        const maybe = (bot as unknown as { temperature?: unknown }).temperature;
        return typeof maybe === "number" ? maybe : undefined;
      })(),
      providerOptions: {
        openrouter: {
          // keep light; routing handled by selected model slug
          // example of extra body / usage toggles
        },
      },
      headers: {
        // OpenRouter best-practice headers
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
        "X-Title": "Joseph Weblet Chat",
      },
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        try {
          console.log("\n" + "-".repeat(80));
          console.log("📍 STEP FINISHED");
          console.log("-".repeat(80));

          if (toolCalls && toolCalls.length > 0) {
            console.log(`🔧 Tool Calls in this step: ${toolCalls.length}`);
            toolCalls.forEach((tc, index) => {
              console.log(`\n   [${index + 1}] ${tc.toolName}`);
              console.log(`       Call ID: ${tc.toolCallId}`);

              // Debug: Log all available keys on the tool call object
              console.log(`       Available keys:`, Object.keys(tc));

              // Try different possible property names for arguments
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tcAny = tc as any;
              const args =
                tcAny.args || tcAny.arguments || tcAny.input || tcAny.parameters;

              // Check for flags that would prevent execution
              console.log(`       Dynamic: ${tcAny.dynamic}`);
              console.log(`       Invalid: ${tcAny.invalid}`);
              console.log(`       Error: ${tcAny.error || "none"}`);
              console.log(
                `       Provider Executed: ${tcAny.providerExecuted || false}`
              );

              console.log(`       Arguments:`, args || {});
              if (args && typeof args === "object") {
                try {
                  console.log(
                    `       Arguments (stringified):`,
                    JSON.stringify(args, null, 2).slice(0, 500)
                  );
                } catch {
                  console.log(`       Arguments: [Unable to stringify]`);
                }
              }
            });
          } else {
            console.log(`   ℹ️  No tool calls in this step`);
          }

          if (toolResults && toolResults.length > 0) {
            console.log(`\n✅ Tool Results in this step: ${toolResults.length}`);
            toolResults.forEach((tr, index) => {
              const output = (tr as { output?: unknown }).output;
              console.log(`\n   [${index + 1}] ${tr.toolName}`);
              console.log(`       Result ID: ${tr.toolCallId}`);

              // Handle undefined or null results
              if (output === undefined || output === null) {
                console.log(
                  `       Result: ${output === undefined ? "undefined" : "null"}`
                );
              } else if (typeof output === "string") {
                console.log(
                  `       Result preview: ${output.slice(0, 150)}${
                    output.length > 150 ? "..." : ""
                  }`
                );
              } else {
                try {
                  // For simulation tools, avoid stringifying the entire result if it's too large
                  if (
                    tr.toolName === "simulate_model" &&
                    typeof output === "object"
                  ) {
                    console.log(`       Result: [Simulation Data Object]`);
                    // Log only metadata or summary if available to avoid max depth/length errors
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const obj = output as any;
                    if (obj._meta) {
                      console.log(
                        `       Meta:`,
                        JSON.stringify(obj._meta).slice(0, 200)
                      );
                    }
                  } else {
                    const stringified = JSON.stringify(output);
                    console.log(
                      `       Result preview: ${stringified.slice(0, 150)}${
                        stringified.length > 150 ? "..." : ""
                      }`
                    );
                  }

                  // 🔍 DETAILED ANALYSIS: Log the structure for simulation results
                  if (
                    tr.toolName === "simulate_model" &&
                    typeof output === "object"
                  ) {
                    console.log(`\n       🔍 DETAILED MCP RESPONSE STRUCTURE:`);
                    console.log(
                      `       Top-level keys:`,
                      Object.keys(output as object)
                    );

                    const obj = output as Record<string, unknown>;

                    // Check for data array at different levels
                    if (obj.data && Array.isArray(obj.data)) {
                      console.log(`       ✅ Found data array at root level`);
                      console.log(`       Data points: ${obj.data.length}`);
                      console.log(`       First point:`, obj.data[0]);
                    } else if (obj._meta) {
                      console.log(
                        `       Found _meta wrapper:`,
                        Object.keys(obj._meta as object)
                      );
                      const meta = obj._meta as Record<string, unknown>;
                      if (meta.result) {
                        console.log(
                          `       Found _meta.result:`,
                          Object.keys(meta.result as object)
                        );
                        const result = meta.result as Record<string, unknown>;
                        if (result.data && Array.isArray(result.data)) {
                          console.log(
                            `       ✅ Found data array at _meta.result.data level`
                          );
                          console.log(
                            `       Data points: ${result.data.length}`
                          );
                          console.log(`       First point:`, result.data[0]);
                        }
                      }
                    } else {
                      console.log(`       ⚠️  NO data array found!`);
                      console.log(`       Available fields:`, Object.keys(obj));
                      const stringified = JSON.stringify(output);
                      console.log(
                        `       Full response (first 500 chars):`,
                        stringified.slice(0, 500)
                      );
                    }
                  }
                } catch (err) {
                  console.log(`       Result: [Unable to stringify result]`, err);
                }
              }
            });
          }

          if (text) {
            console.log(
              `\n   Text generated: ${text.slice(0, 100)}${
                text.length > 100 ? "..." : ""
              }`
            );
          }

          console.log(`   Finish reason: ${finishReason || "continuing"}`);
          console.log(`   Token usage:`, usage || "N/A");
        } catch (error) {
          console.error("Error in onStepFinish:", error);
        }
      },
      onFinish: async ({ text, toolCalls, toolResults, finishReason }) => {
        try {
          console.log("\n" + "-".repeat(80));
          console.log("🔄 ON FINISH CALLBACK TRIGGERED");
          console.log("-".repeat(80));
          console.log(`   Finish Reason: ${finishReason}`);
          console.log(`   Text Length: ${text?.length || 0}`);
          console.log(`   Tool Calls: ${toolCalls?.length || 0}`);
          console.log(`   Tool Results: ${toolResults?.length || 0}`);

          // Delay closing clients to ensure stream completes
          // Use setTimeout to allow the response stream to finish
          setTimeout(async () => {
            try {
              if (arxivClient) {
                try {
                  await arxivClient.close();
                  console.log("🔌 ArXiv MCP client closed");
                } catch (error) {
                  // Ignore AbortError and ECONNRESET - they're harmless connection errors
                  // that occur when the client closes before the server finishes sending
                  const errorCode = (error as { code?: string })?.code;
                  const errorName = error instanceof Error ? error.name : "";
                  if (
                    errorName === "AbortError" ||
                    errorCode === "ECONNRESET" ||
                    errorCode?.includes("ECONNRESET")
                  ) {
                    // Silently ignore - these are expected when client closes early
                    return;
                  }
                  console.error("Error closing ArXiv MCP client:", error);
                }
              }
              if (simulationClient) {
                try {
                  await simulationClient.close();
                  console.log("🔌 Simulation MCP client closed");
                } catch (error) {
                  // Ignore AbortError and ECONNRESET - they're harmless connection errors
                  // that occur when the client closes before the server finishes sending
                  const errorCode = (error as { code?: string })?.code;
                  const errorName = error instanceof Error ? error.name : "";
                  if (
                    errorName === "AbortError" ||
                    errorCode === "ECONNRESET" ||
                    errorCode?.includes("ECONNRESET")
                  ) {
                    // Silently ignore - these are expected when client closes early
                    return;
                  }
                  console.error("Error closing Simulation MCP client:", error);
                }
              }
            } catch (error) {
              // Catch any unexpected errors in the setTimeout callback to prevent uncaught exceptions
              const errorCode = (error as { code?: string })?.code;
              const errorName = error instanceof Error ? error.name : "";
              if (
                errorName === "AbortError" ||
                errorCode === "ECONNRESET" ||
                errorCode?.includes("ECONNRESET")
              ) {
                // Silently ignore connection reset errors
                return;
              }
              console.error("Error in onFinish cleanup:", error);
            }
          }, 5000); // Wait 5 seconds before closing to ensure stream completes

          console.log("\n" + "=".repeat(80));
          console.log("🏁 GENERATION COMPLETE");
          console.log("=".repeat(80));
          // Log tool calls and results
          if (toolCalls && toolCalls.length > 0) {
            console.log(`\n🔧 Tool Calls Completed (${toolCalls.length} total)`);
            toolCalls.forEach((tc) => {
              // Determine which MCP server this tool belongs to
              let serverType = "Unknown";
              if (enableMCP && tc.toolName.toLowerCase().includes("arxiv")) {
                serverType = "ArXiv";
              } else if (enableSimulation) {
                serverType = "Simulation";
              }

              console.log(`   Tool: ${tc.toolName}`);
              console.log(`   Server: ${serverType} MCP`);
              console.log(`   ID: ${tc.toolCallId}`);
              console.log(
                `   Args:`,
                JSON.stringify((tc as { args?: unknown }).args || {}, null, 2)
              );
            });
          }

          if (toolResults && toolResults.length > 0) {
            console.log(
              `\n✅ Tool Results Received (${toolResults.length} total)`
            );
            toolResults.forEach((tr) => {
              const output = (tr as { output?: unknown }).output;
              console.log(`   Tool: ${tr.toolName}`);
              console.log(`   ID: ${tr.toolCallId}`);

              // Handle undefined or null results
              if (output === undefined || output === null) {
                console.log(
                  `   Result: ${output === undefined ? "undefined" : "null"}`
                );
              } else if (typeof output === "string") {
                console.log(
                  `   Result: ${output.slice(0, 200)}${
                    output.length > 200 ? "..." : ""
                  }`
                );
              } else {
                try {
                  const stringified = JSON.stringify(output);
                  console.log(
                    `   Result: ${stringified.slice(0, 200)}${
                      stringified.length > 200 ? "..." : ""
                    }`
                  );
                } catch {
                  console.log(`   Result: [Unable to stringify result]`);
                }
              }
            });
          }

          console.log(`\n📝 Final Summary:`);
          console.log(`   Finish Reason: ${finishReason}`);
          console.log(`   Text Length: ${text?.length || 0} characters`);
          console.log(`   Total Tool Calls: ${toolCalls?.length || 0}`);
          console.log(`   Total Tool Results: ${toolResults?.length || 0}`);

          console.log("\n" + "=".repeat(80) + "\n");
        } catch (error) {
          console.error("Error in onFinish:", error);
        }
      },
      onError: async (error) => {
        try {
          console.error("Stream error:", error);

          // Close MCP clients on error (with delay)
          setTimeout(async () => {
            try {
              if (arxivClient) {
                try {
                  await arxivClient.close();
                } catch (closeError) {
                  // Ignore AbortError and ECONNRESET - they're harmless connection errors
                  const errorCode = (closeError as { code?: string })?.code;
                  const errorName =
                    closeError instanceof Error ? closeError.name : "";
                  if (
                    errorName === "AbortError" ||
                    errorCode === "ECONNRESET" ||
                    errorCode?.includes("ECONNRESET")
                  ) {
                    // Silently ignore - these are expected when client closes early
                    return;
                  }
                  console.error("Error closing ArXiv MCP client:", closeError);
                }
              }
              if (simulationClient) {
                try {
                  await simulationClient.close();
                } catch (closeError) {
                  // Ignore AbortError and ECONNRESET - they're harmless connection errors
                  const errorCode = (closeError as { code?: string })?.code;
                  const errorName =
                    closeError instanceof Error ? closeError.name : "";
                  if (
                    errorName === "AbortError" ||
                    errorCode === "ECONNRESET" ||
                    errorCode?.includes("ECONNRESET")
                  ) {
                    // Silently ignore - these are expected when client closes early
                    return;
                  }
                  console.error(
                    "Error closing Simulation MCP client:",
                    closeError
                  );
                }
              }
            } catch (cleanupError) {
              // Catch any unexpected errors in the setTimeout callback to prevent uncaught exceptions
              const errorCode = (cleanupError as { code?: string })?.code;
              const errorName =
                cleanupError instanceof Error ? cleanupError.name : "";
              if (
                errorName === "AbortError" ||
                errorCode === "ECONNRESET" ||
                errorCode?.includes("ECONNRESET")
              ) {
                // Silently ignore connection reset errors
                return;
              }
              console.error("Error in onError cleanup:", cleanupError);
            }
          }, 1000);
        } catch (err) {
          console.error("Error in onError:", err);
        }
      },
    });

    // For DefaultChatTransport, return the UI message stream response
    // This includes tool calls and results in the message parts automatically
    return result.toUIMessageStreamResponse();
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
