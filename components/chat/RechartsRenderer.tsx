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

interface RechartsRendererProps {
  config: ChartToolConfig;
}

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export function RechartsRendererComponent({ config }: RechartsRendererProps) {
  const { type, data, xKey, yKeys, title } = config;

  if (!data || !data.length) {
    return <div className="text-red-500">No data available for chart.</div>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.name}:</span>
              <span className="font-mono font-medium text-foreground">
                {typeof entry.value === 'number' 
                  ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const Gradients = () => (
      <defs>
        {COLORS.map((color, index) => (
          <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        ))}
      </defs>
    );

    switch (type) {
      case "line":
        return (
          <LineChart data={data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
            <XAxis 
              dataKey={xKey} 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className="text-muted-foreground"
              dy={10}
            />
            <YAxis 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}`} 
              className="text-muted-foreground"
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, className: 'text-muted/50' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {yKeys?.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        );
      case "bar":
        return (
          <BarChart data={data} {...commonProps}>
            <Gradients />
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
            <XAxis 
              dataKey={xKey} 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className="text-muted-foreground"
              dy={10}
            />
            <YAxis 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className="text-muted-foreground"
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'text-muted/10' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {yKeys?.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={`url(#gradient-${index % COLORS.length})`}
                stroke={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]} 
                isAnimationActive={false} 
              />
            ))}
          </BarChart>
        );
      case "area":
        return (
          <AreaChart data={data} {...commonProps}>
            <Gradients />
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
            <XAxis 
              dataKey={xKey} 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className="text-muted-foreground"
              dy={10}
            />
            <YAxis 
              stroke="currentColor" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              className="text-muted-foreground"
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, className: 'text-muted/50' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {yKeys?.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={`url(#gradient-${index % COLORS.length})`}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        );
      case "pie":
        // For pie charts, we typically only use the first yKey as the value
        const valueKey = yKeys?.[0] || Object.keys(data[0]).find((k) => k !== xKey);
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              innerRadius={60}
              paddingAngle={2}
              dataKey={valueKey as string}
              nameKey={xKey}
              isAnimationActive={false}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        );
      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {title && <h3 className="text-center font-semibold mb-2 text-sm text-muted-foreground">{title}</h3>}
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const RechartsRenderer = React.memo(RechartsRendererComponent);
