import { tool } from "ai";
import { z } from "zod";
import { runSimulation, type SimulationSpec } from "@/lib/simulation-tool";

export const createSimulationTool = () => {
  return tool({
    description:
      "Run a simulation described by a structured JSON spec and return artifacts + metrics.\n\nFeatures:\n- Returns actual data points for interactive visualization (set return_data=True)\n- Preview mode for faster rendering with fewer data points (set time_span.preview_mode=True)\n- Optional artifact saving (set save_artifacts=False for faster response)",
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
};
