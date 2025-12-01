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
    } = BodySchema.extend({ enableSimulation: z.boolean().optional() }).parse(
      json
    );

    console.log("API Request:", {
      botId,
      enableSimulation,
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
        description:
          "Generate a chart or diagram. Supports quantitative charts (line, bar, pie, area) and diagrams (flowchart, gantt). Use this tool to visualize data or processes. IMPORTANT: When using this tool, do NOT output the chart code in markdown/text. Only use the tool.",
        parameters: chartToolSchema,
        execute: async (chartData) => {
          console.log("Executing chart generation tool:", chartData.type);
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
        if (error instanceof Error) return error.message;
        return JSON.stringify(error);
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
