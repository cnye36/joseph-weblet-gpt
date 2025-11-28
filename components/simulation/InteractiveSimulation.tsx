"use client";

import { useState, useEffect, useMemo } from "react";
import {
  runSIRSimulation,
  calculateR0,
  calculatePeakInfection,
  calculateFinalSize,
  type SIRParameters,
  type SIRState,
  type SIRDataPoint,
} from "@/lib/simulation/sir-model";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
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

export interface InteractiveSimulationProps {
  /** Initial parameters (from AI) */
  initialParameters: SIRParameters;
  /** Initial state (from AI) */
  initialState: SIRState;
  /** Simulation time end */
  timeEnd: number;
  /** Number of time steps */
  timeSteps?: number;
  /** Show description text */
  showDescription?: boolean;
}

/**
 * Interactive SIR Simulation with LIVE CONTROLS
 * 
 * This component demonstrates the "Shared Logic Pattern":
 * 1. Server (AI tool) provides initial parameters
 * 2. Client renders with interactive sliders
 * 3. On slider change, recalculate INSTANTLY (no server round-trip)
 * 4. Uses Recharts for smooth, responsive visualization
 * 
 * This is ~1000x faster than calling a server endpoint on every change!
 */
export function InteractiveSimulation({
  initialParameters,
  initialState,
  timeEnd,
  timeSteps = 200,
  showDescription = true,
}: InteractiveSimulationProps) {
  // Current parameters (user can adjust with sliders)
  const [parameters, setParameters] = useState<SIRParameters>(initialParameters);

  // Run simulation whenever parameters change
  const simulationData = useMemo(() => {
    try {
      return runSIRSimulation({
        parameters,
        initialState,
        timeEnd,
        timeSteps,
      });
    } catch (error) {
      console.error("Simulation error:", error);
      return [];
    }
  }, [parameters, initialState, timeEnd, timeSteps]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (simulationData.length === 0) return null;

    const r0 = calculateR0(parameters);
    const peak = calculatePeakInfection(simulationData);
    const finalSize = calculateFinalSize(simulationData);

    return { r0, peak, finalSize };
  }, [simulationData, parameters]);

  // Format data for Recharts (convert to percentage)
  const chartData = useMemo(() => {
    return simulationData.map((point) => ({
      time: point.time,
      Susceptible: (point.S * 100).toFixed(2),
      Infected: (point.I * 100).toFixed(2),
      Recovered: (point.R * 100).toFixed(2),
    }));
  }, [simulationData]);

  return (
    <div className="w-full space-y-6 p-6 bg-card rounded-lg border">
      {showDescription && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Interactive SIR Model Simulation</h3>
          <p className="text-sm text-muted-foreground">
            Adjust the parameters below to see how they affect disease spread in
            real-time. No server requests needed - all calculations happen instantly
            in your browser!
          </p>
        </div>
      )}

      {/* Live Controls */}
      <div className="space-y-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm">Live Controls</h4>

        {/* Beta Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="beta-slider" className="text-sm font-medium">
              β (Beta) - Infection Rate
            </Label>
            <span className="text-sm font-mono bg-background px-2 py-1 rounded border">
              {parameters.beta.toFixed(3)}
            </span>
          </div>
          <Slider
            id="beta-slider"
            min={0.05}
            max={0.5}
            step={0.01}
            value={[parameters.beta]}
            onValueChange={([value]) => setParameters((p) => ({ ...p, beta: value }))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            How quickly susceptible individuals become infected when exposed
          </p>
        </div>

        {/* Gamma Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="gamma-slider" className="text-sm font-medium">
              γ (Gamma) - Recovery Rate
            </Label>
            <span className="text-sm font-mono bg-background px-2 py-1 rounded border">
              {parameters.gamma.toFixed(3)}
            </span>
          </div>
          <Slider
            id="gamma-slider"
            min={0.02}
            max={0.3}
            step={0.01}
            value={[parameters.gamma]}
            onValueChange={([value]) => setParameters((p) => ({ ...p, gamma: value }))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            How quickly infected individuals recover (or are removed)
          </p>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">R₀ (Basic Reproduction Number)</div>
            <div className="text-2xl font-bold">
              {metrics.r0.toFixed(2)}
            </div>
            <div className="text-xs mt-1">
              {metrics.r0 > 1 ? (
                <span className="text-red-500">● Epidemic will spread</span>
              ) : (
                <span className="text-green-500">● Epidemic will die out</span>
              )}
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Peak Infection</div>
            <div className="text-2xl font-bold">
              {(metrics.peak.peakInfected * 100).toFixed(1)}%
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              at day {metrics.peak.peakTime.toFixed(0)}
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">Total Infected</div>
            <div className="text-2xl font-bold">
              {(metrics.finalSize * 100).toFixed(1)}%
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              of population
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full">
        <div className="text-sm font-medium mb-2">Population Dynamics Over Time</div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              label={{ value: "Time (days)", position: "insideBottom", offset: -5 }}
              className="text-xs"
            />
            <YAxis
              label={{ value: "Population (%)", angle: -90, position: "insideLeft" }}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Susceptible"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Susceptible"
            />
            <Line
              type="monotone"
              dataKey="Infected"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Infected"
            />
            <Line
              type="monotone"
              dataKey="Recovered"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="Recovered"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model Equations */}
      <div className="p-4 bg-muted/30 rounded-lg border text-sm space-y-2">
        <div className="font-medium">SIR Model Equations</div>
        <div className="font-mono text-xs space-y-1">
          <div>dS/dt = -β × S × I</div>
          <div>dI/dt = β × S × I - γ × I</div>
          <div>dR/dt = γ × I</div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Initial conditions: S₀ = {(initialState.S * 100).toFixed(1)}%, I₀ = {(initialState.I * 100).toFixed(1)}%, R₀ = {(initialState.R * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

