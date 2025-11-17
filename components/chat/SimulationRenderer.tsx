"use client";

import { useState, useEffect, useCallback, memo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface SimulationData {
  type?: string;
  data?: Array<Record<string, number | string>>;
  parameters?: Record<string, {
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    label?: string;
  }>;
  labels?: {
    x?: string;
    y?: string;
    title?: string;
  };
  chartType?: "line" | "area" | "scatter";
  description?: string;
}

interface SimulationRendererProps {
  initialData: SimulationData;
  onRerun?: (params: Record<string, number>) => Promise<SimulationData>;
}

const SimulationRendererComponent = ({
  initialData,
  onRerun,
}: SimulationRendererProps) => {
  const [data, setData] = useState<SimulationData>(initialData);
  const [parameters, setParameters] = useState<Record<string, number>>(() => {
    const params: Record<string, number> = {};
    if (initialData.parameters) {
      Object.entries(initialData.parameters).forEach(([key, config]) => {
        params[key] = config.value;
      });
    }
    return params;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if parameters have changed from initial values
  useEffect(() => {
    if (!initialData.parameters) return;
    
    const changed = Object.entries(parameters).some(([key, value]) => {
      const initialValue = initialData.parameters?.[key]?.value;
      return initialValue !== undefined && Math.abs(value - initialValue) > 0.001;
    });
    
    setHasChanges(changed);
  }, [parameters, initialData.parameters]);

  const handleParameterChange = useCallback((key: string, value: number[]) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value[0],
    }));
  }, []);

  const handleRerun = useCallback(async () => {
    setIsRunning(true);
    try {
      // If onRerun prop is provided, use it
      if (onRerun) {
        const newData = await onRerun(parameters);
        setData(newData);
        setHasChanges(false);
        return;
      }

      // Otherwise, call our API proxy endpoint (avoids CORS issues)
      const response = await fetch('/api/simulation/rerun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: {
            ...parameters,
            steps: data.data?.length || 100
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run simulation');
      }

      const result = await response.json();

      // Update with new simulation data
      setData(prev => ({
        ...prev,
        data: result.data
      }));
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to rerun simulation:", error);
      alert(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  }, [onRerun, parameters, data.data]);

  const renderChart = () => {
    if (!data.data || data.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No simulation data available
        </div>
      );
    }

    const chartType = data.chartType || "line";
    const dataKeys = Object.keys(data.data[0]).filter((key) => key !== "x" && key !== "time" && key !== "t");
    const xKey = data.data[0].x !== undefined ? "x" : data.data[0].time !== undefined ? "time" : "t";

    const colors = [
      "#3b82f6", // blue
      "#ef4444", // red
      "#10b981", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#14b8a6", // teal
    ];

    const commonProps = {
      data: data.data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const commonAxisProps = {
      stroke: "#888",
      style: { fontSize: "12px" },
    };

    if (chartType === "scatter") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey={xKey}
              {...commonAxisProps}
              label={{
                value: data.labels?.x || xKey,
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              {...commonAxisProps}
              label={{
                value: data.labels?.y || "Value",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Scatter
                key={key}
                name={key}
                dataKey={key}
                fill={colors[index % colors.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart {...commonProps}>
            <defs>
              {dataKeys.map((key, index) => (
                <linearGradient
                  key={key}
                  id={`color${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey={xKey}
              {...commonAxisProps}
              label={{
                value: data.labels?.x || xKey,
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              {...commonAxisProps}
              label={{
                value: data.labels?.y || "Value",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <Legend />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fillOpacity={1}
                fill={`url(#color${key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: Line chart
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey={xKey}
            {...commonAxisProps}
            label={{
              value: data.labels?.x || xKey,
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            {...commonAxisProps}
            label={{
              value: data.labels?.y || "Value",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <Legend />
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card my-4 -mx-3 sm:mx-0 sm:max-w-full w-[calc(100%+1.5rem)] sm:w-full">
      {/* Header */}
      <div className="bg-purple-100 dark:bg-purple-900/30 border-b border-purple-300 dark:border-purple-700 px-4 py-3">
        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
          {data.labels?.title || data.type || "Simulation Results"}
        </h3>
        {data.description && (
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1 break-words whitespace-pre-wrap">
            {data.description}
          </p>
        )}
      </div>

      {/* Chart Area */}
      <div className="p-4 bg-background">
        {renderChart()}
      </div>

      {/* Controls Section */}
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowControls(!showControls)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm">
              Simulation Parameters
              {hasChanges && (
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                  (Modified)
                </span>
              )}
            </span>
            {showControls ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {showControls && (
            <div className="px-4 pb-4 space-y-4 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.parameters).map(([key, config]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`param-${key}`} className="text-sm font-medium">
                        {config.label || key}
                      </Label>
                      <span className="text-sm font-mono text-muted-foreground">
                        {parameters[key].toFixed(2)}
                        {config.unit && ` ${config.unit}`}
                      </span>
                    </div>
                    <Slider
                      id={`param-${key}`}
                      min={config.min}
                      max={config.max}
                      step={config.step || 0.01}
                      value={[parameters[key]]}
                      onValueChange={(value) => handleParameterChange(key, value)}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{config.min}{config.unit && ` ${config.unit}`}</span>
                      <span>{config.max}{config.unit && ` ${config.unit}`}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleRerun}
                  disabled={isRunning || !hasChanges}
                  className="w-full"
                  variant={hasChanges ? "default" : "secondary"}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4 mr-2" />
                      {hasChanges ? "Run Simulation with New Parameters" : "No Changes to Apply"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders during streaming
// Only re-render if initialData.data length changes (indicates new complete data)
export const SimulationRenderer = memo(SimulationRendererComponent, (prevProps, nextProps) => {
  // Only re-render if data length changed (new simulation data loaded)
  const prevDataLength = prevProps.initialData.data?.length || 0;
  const nextDataLength = nextProps.initialData.data?.length || 0;

  // Return true to SKIP re-render, false to allow re-render
  return prevDataLength === nextDataLength;
});





