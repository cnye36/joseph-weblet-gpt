import { openrouter } from "@/lib/openrouter";
import { bots, type BotId, defaultBotId } from "@/lib/bots";
import { createClient } from "@/lib/supabase/server";
import { streamText, convertToCoreMessages, tool } from "ai";
import { z } from "zod";
import {
  runSimulation,
  SimulationSchema,
  type SimulationConfig,
} from "@/lib/simulation/core";
import { chartToolSchema } from "@/lib/chart-schemas";
import { arxivTools } from "@/lib/tools/arxiv";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const BodySchema = z.object({
  botId: z.custom<BotId>().optional(),
  chatId: z.string().optional(),
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant", "system"]) }).passthrough()
  ),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const {
      botId = defaultBotId,
      messages,
      enableSimulation = false,
      enableArxiv = false,
    } = BodySchema.extend({ 
      enableSimulation: z.boolean().optional(),
      enableArxiv: z.boolean().optional() 
    }).parse(
      json
    );

    console.log("API Request:", {
      botId,
      enableSimulation,
      enableArxiv,
      messagesCount: messages.length,
    });

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
      console.error("Failed to load bot config from DB:", error);
    }

    const modelSlug = ((): string => {
      const raw = bot.model || "openrouter/auto";
      if (raw.includes("/")) return raw;
      return `openai/${raw}`;
    })();

    // Convert messages with proper typing for AI SDK
    const coreMessages = convertToCoreMessages(
      messages.map((msg) => {
        const { role, content = "", ...rest } = msg;
        return {
          role,
          content: String(content),
          ...rest,
        };
      })
    );

    // Define tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {
      generate_chart: tool({
        description: `Generate a chart or diagram. 

CRITICAL: You MUST include all required fields based on chart type.

For LINE/BAR/PIE/AREA charts, you MUST include:
- type: the chart type
- title: chart title
- data: an array of data objects (REQUIRED - do not omit!)
- xKey: the property name for x-axis values
- yKeys: array of property names for y-axis values

Example for line chart:
{
  "type": "line",
  "title": "Sales Over Time",
  "data": [
    {"month": "Jan", "sales": 100},
    {"month": "Feb", "sales": 150},
    {"month": "Mar", "sales": 200}
  ],
  "xKey": "month",
  "yKeys": ["sales"]
}

For FLOWCHART, you MUST include:
- type: "flowchart"
- title: chart title
- nodes: array of {id, label, shape?}
- edges: array of {from, to, label?}
- direction: "TD" | "LR" | "BT" | "RL"

For GANTT, you MUST include:
- type: "gantt"
- title: chart title
- tasks: array of {id, label, start?, end?, duration?, dependsOn?}`,
        parameters: chartToolSchema,
        execute: async (chartData) => {
          console.log("=== CHART TOOL EXECUTION ===");
          console.log("Chart Type:", chartData.type);
          console.log("Chart Title:", chartData.title);
          console.log("Full Chart Data:", JSON.stringify(chartData, null, 2));
          
          // Check for common issues
          if (chartData.type === "line" || chartData.type === "bar" || chartData.type === "pie" || chartData.type === "area") {
            console.log("Quantitative chart detected");
            console.log("Data array:", chartData.data);
            console.log("Data length:", chartData.data?.length || 0);
            console.log("xKey:", chartData.xKey);
            console.log("yKeys:", chartData.yKeys);
            
            // Validate required fields
            if (!chartData.data || chartData.data.length === 0) {
              console.error("ERROR: No data array provided for quantitative chart!");
            }
          }
          
          if (chartData.type === "flowchart") {
            console.log("Flowchart detected");
            console.log("Nodes:", chartData.nodes);
            console.log("Edges:", chartData.edges);
          }
          
          if (chartData.type === "gantt") {
            console.log("Gantt chart detected");
            console.log("Tasks:", chartData.tasks);
          }
          
          return chartData;
        },
      }),
    };

    // Conditionally add simulation tool
    if (enableSimulation) {
      tools.simulate_model = tool({
        description:
          "Run a scientific simulation. Supported models: 'SIR' (epidemiology), 'Logistic' (population growth), 'Projectile' (physics). You MUST use one of these exact strings for 'model_type'. Do NOT use 'custom'. For logistic growth, use 'Logistic'.",
        parameters: z.object({
          config: SimulationSchema,
        }),
        execute: async ({ config }) => {
          console.log("Executing simulation tool:", config.model_type);
          try {
            const result = runSimulation(config as SimulationConfig);
            console.log("Simulation result status:", result.status);
            return {
              ...result,
              config,
            };
          } catch (e) {
            console.error("Simulation execution error:", e);
            throw e;
          }
        },
      });
    }

    // Conditionally add arxiv tools
    if (enableArxiv) {
      Object.assign(tools, arxivTools);
    }

    const result = await streamText({
      model: openrouter(modelSlug),
      system: `${bot.system || ""}
      
      IMPORTANT: When you need to generate a chart or diagram, you MUST use the 'generate_chart' tool. 
      - Do NOT output the mermaid code block in your text response. 
      - Do NOT output the chart data in your text response.
      - ONLY call the tool.
      - If you output markdown code for a chart, it will be considered an error.`,
      messages: coreMessages,
      tools,
      maxSteps: 5,
      temperature: ((): number | undefined => {
        const maybe = (bot as unknown as { temperature?: unknown }).temperature;
        return typeof maybe === "number" ? maybe : undefined;
      })(),
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("Stream error:", error);
        if (error instanceof Error) {
          if (error.message.includes("No endpoints found that support tool use")) {
            return "The selected model does not support tools (charts/simulations). Please disable simulation mode or select a different model.";
          }
          return error.message;
        }
        const errorString = JSON.stringify(error);
        if (errorString.includes("No endpoints found that support tool use")) {
          return "The selected model does not support tools (charts/simulations). Please disable simulation mode or select a different model.";
        }
        return errorString;
      },
    });
  } catch (error) {
    console.error("Route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
