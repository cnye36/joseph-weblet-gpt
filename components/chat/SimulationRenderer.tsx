"use client";

import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
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
  parameters?: Record<
    string,
    {
      value: number;
      min: number;
      max: number;
      step?: number;
      unit?: string;
      label?: string;
    }
  >;
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
  onRerun?: (params: Record<string, number>) => Promise<void>;
  onUpdate?: (newData: SimulationData) => void;
  originalArgs?: Record<string, unknown>;
}

const SimulationRendererComponent = ({
  initialData,
  onRerun,
  onUpdate,
  originalArgs,
}: SimulationRendererProps) => {
  const [data, setData] = useState<SimulationData>(initialData);

  // Extract initial parameters ONCE on mount - use a ref to ensure it's truly stable
  const initialParametersRef = useRef<Record<string, number>>({});
  if (
    Object.keys(initialParametersRef.current).length === 0 &&
    initialData.parameters
  ) {
    const params: Record<string, number> = {};
    Object.entries(initialData.parameters).forEach(([key, config]) => {
      params[key] = config.value;
    });
    initialParametersRef.current = params;
  }
  const initialParameters = initialParametersRef.current;

  const [parameters, setParameters] =
    useState<Record<string, number>>(initialParameters);
  const [isRunning, setIsRunning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if parameters have changed from initial values
  // Use useMemo to compute hasChanges without causing re-renders
  const hasChangesComputed = useMemo(() => {
    if (Object.keys(initialParameters).length === 0) {
      return false;
    }

    return Object.entries(parameters).some(([key, value]) => {
      const initialValue = initialParameters[key];
      return (
        initialValue !== undefined && Math.abs(value - initialValue) > 0.001
      );
    });
  }, [parameters, initialParameters]);

  // Only update state if the computed value actually changed
  useEffect(() => {
    setHasChanges(hasChangesComputed);
  }, [hasChangesComputed]);

  const handleParameterChange = useCallback((key: string, value: number[]) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value[0],
    }));
  }, []);

  const handleRerun = useCallback(async () => {
    setIsRunning(true);
    try {
      // If onUpdate is provided, call the API directly and update in place
      if (onUpdate) {
        const response = await fetch("/api/simulation/rerun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parameters,
            originalArgs,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to rerun simulation");
        }

        const result = await response.json();

        // Transform the result to match SimulationData format
        const newData: SimulationData = {
          ...data,
          data: result.data || data.data,
        };

        setData(newData);
        onUpdate(newData);

        // CRITICAL FIX: Update initialParametersRef to current parameters after rerun
        // This ensures subsequent parameter changes are compared against the rerun parameters
        // allowing the rerun button to appear again when parameters change
        initialParametersRef.current = { ...parameters };

        setHasChanges(false);
      } else if (onRerun) {
        // Fallback: use the old method (sends message to LLM)
        await onRerun(parameters);
        // Update initialParametersRef even for fallback method
        initialParametersRef.current = { ...parameters };
        setHasChanges(false);
      } else {
        console.warn("No rerun callback provided");
      }
    } catch (error) {
      console.error("Failed to rerun simulation:", error);
      alert(
        `Simulation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsRunning(false);
    }
  }, [onRerun, onUpdate, parameters, originalArgs, data]);

  const renderChart = () => {
    if (!data.data || data.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No simulation data available
        </div>
      );
    }

    const chartType = data.chartType || "line";
    const dataKeys = Object.keys(data.data[0]).filter(
      (key) => key !== "x" && key !== "time" && key !== "t"
    );
    const xKey =
      data.data[0].x !== undefined
        ? "x"
        : data.data[0].time !== undefined
        ? "time"
        : "t";

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
      margin: { top: 10, right: 30, left: 20, bottom: 20 },
    };

    const commonAxisProps = {
      stroke: "#888",
      style: { fontSize: "12px" },
    };

    if (chartType === "scatter") {
      return (
        <ResponsiveContainer width="100%" height={500}>
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
        <ResponsiveContainer width="100%" height={500}>
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
      <ResponsiveContainer width="100%" height={500}>
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
    <div className="border rounded-lg overflow-hidden bg-card my-4 w-full max-w-none">
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
      <div className="p-6 bg-background w-full">
        <div className="w-full" style={{ minHeight: "500px", width: "100%" }}>
          {renderChart()}
        </div>
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
                      <Label
                        htmlFor={`param-${key}`}
                        className="text-sm font-medium"
                      >
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
                      onValueChange={(value) =>
                        handleParameterChange(key, value)
                      }
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {config.min}
                        {config.unit && ` ${config.unit}`}
                      </span>
                      <span>
                        {config.max}
                        {config.unit && ` ${config.unit}`}
                      </span>
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
                      {hasChanges
                        ? "Run Simulation with New Parameters"
                        : "No Changes to Apply"}
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
// Use default shallow comparison instead of custom comparison
export const SimulationRenderer = memo(SimulationRendererComponent);





