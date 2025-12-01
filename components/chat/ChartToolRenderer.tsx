"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartToolConfig } from "@/lib/chart-schemas";
import { generateMermaidString } from "@/lib/chart-utils";
import MermaidChart from "./MermaidChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ChartToolRendererProps {
  config: ChartToolConfig;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function ChartToolRenderer({ config }: ChartToolRendererProps) {
  const { type, title, description, data, xKey, yKeys } = config;

  // Memoize the mermaid string generation to prevent re-renders
  const mermaidString = React.useMemo(() => {
    if (type === "flowchart" || type === "gantt") {
      return generateMermaidString(config);
    }
    return "";
  }, [type, config]);

  if (type === "flowchart" || type === "gantt") {
    return (
      <Card className="w-full my-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <MermaidChart chart={mermaidString} />
        </CardContent>
      </Card>
    );
  }

  // Quantitative charts
  if (!data || data.length === 0) {
    return <div className="p-4 border rounded text-muted-foreground">No data available for chart</div>;
  }

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }}
              labelStyle={{ color: "var(--popover-foreground)" }}
            />
            <Legend />
            {yKeys?.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }}
              labelStyle={{ color: "var(--popover-foreground)" }}
            />
            <Legend />
            {yKeys?.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }}
              labelStyle={{ color: "var(--popover-foreground)" }}
            />
            <Legend />
            {yKeys?.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </AreaChart>
        );
      case "pie":
        // For pie chart, we usually visualize one metric across categories (xKey)
        // Or multiple metrics for one category? Usually the former.
        // Let's assume yKeys[0] is the value and xKey is the name.
        const valueKey = yKeys?.[0] || "value";
        const nameKey = xKey || "name";
        
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name?: string | number; percent?: number }) =>
                `${name ?? ""} ${(percent ? percent * 100 : 0).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey={valueKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }}
               itemStyle={{ color: "var(--popover-foreground)" }}
            />
            <Legend />
          </PieChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className="w-full my-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(ChartToolRenderer);
