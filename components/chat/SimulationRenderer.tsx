"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSimulation, SimulationConfig, SimulationResult } from "@/lib/simulation/core";

interface SimulationRendererProps {
  initialConfig: SimulationConfig;
  initialResult?: SimulationResult;
}

export default function SimulationRenderer({
  initialConfig,
  initialResult,
}: SimulationRendererProps) {
  const [config, setConfig] = useState<SimulationConfig>(initialConfig);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const result = useMemo(() => {
    // Optimization: use initialResult if config hasn't changed
    if (initialResult && JSON.stringify(config) === JSON.stringify(initialConfig)) {
      return initialResult;
    }
    return runSimulation(config);
  }, [config, initialConfig, initialResult]);

  const handleParamChange = (key: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    } as SimulationConfig));
  };

  const handleInitialConditionChange = (key: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      initial_conditions: {
        ...prev.initial_conditions,
        [key]: value,
      },
    } as SimulationConfig));
  };

  if (!isClient) {
    return <div className="p-4 text-center text-muted-foreground">Loading simulation...</div>;
  }

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

  return (
    <Card className="w-full my-4 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex justify-between items-center">
          <span>{config.model_type} Simulation</span>
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
            {config.domain}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="t" 
                label={{ value: "Time", position: "insideBottomRight", offset: -5 }} 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                isAnimationActive={false}
              />
              <Legend />
              {result.columns
                .filter((col) => col !== "t")
                .map((col, idx) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(config.parameters).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{key}</label>
                  <span className="text-sm text-muted-foreground">{value.toFixed(2)}</span>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={key === "K" || key === "timeEnd" ? 200 : 1} // Simple heuristic for ranges
                  step={0.01}
                  onValueChange={(vals) => handleParamChange(key, vals[0])}
                  className="py-2"
                />
              </div>
            ))}
            
            {/* Only show relevant initial conditions sliders if needed, usually parameters are enough for interaction */}
            {Object.entries(config.initial_conditions).map(([key, value]) => (
               <div key={`init-${key}`} className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{key} (Initial)</label>
                  <span className="text-sm text-muted-foreground">{value.toFixed(2)}</span>
                </div>
                <Slider
                  value={[value]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(vals) => handleInitialConditionChange(key, vals[0])}
                  className="py-2"
                />
              </div>
            ))}
          </div>
          
          {result.summary && (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              {result.summary}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
