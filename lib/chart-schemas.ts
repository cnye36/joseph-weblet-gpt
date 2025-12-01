import { z } from "zod";

// A flat schema to avoid union issues with AI SDK
export const chartToolSchema = z.object({
  type: z.enum(["line", "bar", "pie", "area", "flowchart", "gantt"]).describe("The type of chart to generate"),
  title: z.string().describe("The title of the chart"),
  description: z.string().optional().describe("A brief description of what the chart shows"),
  
  // For quantitative charts (line, bar, pie, area)
  data: z.array(z.record(z.any())).optional().describe("Data points for quantitative charts (line, bar, pie, area). Example: [{ name: 'Jan', value: 100 }, { name: 'Feb', value: 200 }]"),
  xKey: z.string().optional().describe("The key in the data objects to use for the X-axis (e.g., 'name', 'date')"),
  yKeys: z.array(z.string()).optional().describe("The keys in the data objects to use for the Y-axis values (e.g., ['value', 'sales'])"),
  
  // For Flowcharts
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    shape: z.enum(["rect", "circle", "diamond", "stadium", "cylinder", "subroutine"]).optional().describe("Shape of the node. Default is 'rect'"),
  })).optional().describe("Nodes for flowcharts"),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
  })).optional().describe("Edges/connections for flowcharts"),
  direction: z.enum(["TD", "LR", "BT", "RL"]).optional().describe("Direction of the flowchart (TD=Top-Down, LR=Left-Right)"),
  
  // For Gantt charts
  tasks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    start: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end: z.string().optional().describe("End date (YYYY-MM-DD)"),
    duration: z.string().optional().describe("Duration (e.g., '3d', '2w')"),
    dependsOn: z.array(z.string()).optional().describe("IDs of tasks this task depends on"),
    percent: z.number().optional().describe("Completion percentage (0-100)"),
  })).optional().describe("Tasks for gantt charts"),
});

export type ChartToolConfig = z.infer<typeof chartToolSchema>;
