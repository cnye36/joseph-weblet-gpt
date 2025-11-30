"use client";

import { z } from "zod";

const ganttTaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  duration: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  status: z.enum(["active", "done", "crit"]).optional(),
  milestone: z.boolean().optional(),
});

const ganttSectionSchema = z.object({
  name: z.string().min(1),
  tasks: z.array(ganttTaskSchema).min(1),
});

const ganttChartSchema = z.object({
  type: z.literal("gantt"),
  title: z.string().default("Project Timeline"),
  dateFormat: z.enum(["YYYY-MM-DD"]).default("YYYY-MM-DD"),
  sections: z.array(ganttSectionSchema).min(1),
});

const flowchartNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  shape: z
    .enum([
      "rounded",
      "stadium",
      "subroutine",
      "cylinder",
      "circle",
      "diamond",
      "hexagon",
      "parallelogram",
      "parallelogram-alt",
      "trapezoid",
      "trapezoid-alt",
      "doublecircle",
      "doc",
      "rect",
    ])
    .default("rect"),
});

const flowchartEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

const flowchartChartSchema = z.object({
  type: z.literal("flowchart"),
  direction: z.enum(["TD", "BT", "LR", "RL"]).default("TD"),
  nodes: z.array(flowchartNodeSchema).min(2),
  edges: z.array(flowchartEdgeSchema).min(1),
});

export const chartSchema = z.discriminatedUnion("type", [
  ganttChartSchema,
  flowchartChartSchema,
]);

export type ChartData = z.infer<typeof chartSchema>;

const shapeMap: Record<string, (id: string, label: string) => string> = {
  rounded: (id, label) => `${id}(${label})`,
  stadium: (id, label) => `${id}([${label}])`,
  subroutine: (id, label) => `${id}[[${label}]]`,
  cylinder: (id, label) => `${id}[(${label})]`,
  circle: (id, label) => `${id}((${label}))`,
  diamond: (id, label) => `${id}{${label}}`,
  hexagon: (id, label) => `${id}{{${label}}}`,
  parallelogram: (id, label) => `${id}[/ ${label} /]`,
  "parallelogram-alt": (id, label) => `${id}[\\ ${label} \\]`,
  trapezoid: (id, label) => `${id}[/\\ ${label} /\\]`,
  "trapezoid-alt": (id, label) => `${id}[\\/ ${label} \\/]`,
  doublecircle: (id, label) => `${id}((( ${label} )))`,
  doc: (id, label) => `${id}[/ ${label} \\]`,
  rect: (id, label) => `${id}[${label}]`,
};

const sanitizeId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24) || `node${Math.random().toString(36).slice(2, 8)}`;

const formatDuration = (task: z.infer<typeof ganttTaskSchema>) => {
  if (task.duration && task.duration.trim().length > 0) {
    return task.duration.trim();
  }
  if (typeof task.durationDays === "number") {
    return `${Math.max(1, Math.round(task.durationDays))}d`;
  }
  if (task.start && task.end) {
    const start = new Date(task.start);
    const end = new Date(task.end);
    const delta = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${delta}d`;
  }
  return "7d";
};

const formatStart = (task: z.infer<typeof ganttTaskSchema>) => {
  if (task.dependsOn && task.dependsOn.length > 0) {
    const afterId = sanitizeId(task.dependsOn[task.dependsOn.length - 1]);
    return `after ${afterId}`;
  }
  if (task.start) return task.start;
  return new Date().toISOString().slice(0, 10);
};

const buildGanttChart = (chart: z.infer<typeof ganttChartSchema>) => {
  const lines: string[] = [];
  lines.push("gantt");
  lines.push(`    title ${chart.title}`);
  lines.push(`    dateFormat ${chart.dateFormat}`);

  chart.sections.forEach((section) => {
    lines.push(`    section ${section.name}`);
    section.tasks.forEach((task) => {
      const id = sanitizeId(task.id);
      const statusPrefix = task.status ? `${task.status} ` : "";
      const milestoneSuffix = task.milestone ? ", 0d" : "";
      lines.push(
        `    ${task.label}    :${statusPrefix}${id}, ${formatStart(
          task
        )}, ${formatDuration(task)}${milestoneSuffix}`
      );
    });
  });

  return lines.join("\n");
};

const buildFlowchart = (chart: z.infer<typeof flowchartChartSchema>) => {
  const lines: string[] = [];
  lines.push(`flowchart ${chart.direction}`);
  
  // Helper function to add line breaks to long labels
  const formatLabel = (label: string): string => {
    if (label.length <= 20) return label;
    
    // Split on spaces and add <br/> when line gets too long
    const words = label.split(' ');
    const formattedLines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= 20) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) formattedLines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) formattedLines.push(currentLine);
    return formattedLines.join('<br/>');
  };
  
  chart.nodes.forEach((node) => {
    const id = sanitizeId(node.id);
    const formattedLabel = formatLabel(node.label);
    const renderer = shapeMap[node.shape] || shapeMap.rect;
    lines.push(`    ${renderer(id, formattedLabel)}`);
  });
  chart.edges.forEach((edge) => {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    const label = edge.label ? `|${edge.label}|` : "";
    lines.push(`    ${from} -->${label} ${to}`);
  });
  return lines.join("\n");
};

export const buildMermaidFromChartData = (raw: unknown) => {
  const parsed = chartSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e) => e.message).join("; "));
  }

  const chart = parsed.data;
  if (chart.type === "gantt") {
    return buildGanttChart(chart);
  }
  if (chart.type === "flowchart") {
    return buildFlowchart(chart);
  }
  throw new Error("Unsupported chart type");
};


