/**
 * Simulation Tool
 * 
 * Internal implementation of the simulation logic, replacing the external MCP server.
 * Currently supports the SIR epidemiology model.
 */

export interface SimulationSpec {
  domain: string;
  model_type: string;
  parameters: Record<string, number>;
  initial_conditions: Record<string, number>;
  time_span: {
    start: number;
    end: number;
    steps?: number;
    preview_mode?: boolean;
  };
  method?: "RK45" | "RK23" | "DOP853"; // Kept for compatibility, but we'll use a simple RK4
  return_data?: boolean;
  save_artifacts?: boolean;
  sensitivity?: Record<string, number>;
  tags?: string[];
}

export interface SimulationResult {
  status: "success" | "error";
  message?: string;
  data: Array<Record<string, number | string>>;
  metrics?: Record<string, number>;
  summary?: string;
  columns?: string[];
}

/**
 * Runs a simulation based on the provided specification.
 * 
 * @param spec - The simulation specification
 * @returns The simulation result
 */
export async function runSimulation(spec: SimulationSpec): Promise<SimulationResult> {
  try {
    if (spec.domain !== "epidemiology" || spec.model_type !== "SIR") {
      throw new Error(`Unsupported model: ${spec.domain}/${spec.model_type}. Only epidemiology/SIR is currently supported.`);
    }

    // Extract parameters
    const beta = spec.parameters.beta;
    const gamma = spec.parameters.gamma;
    
    if (beta === undefined || gamma === undefined) {
      throw new Error("Missing required parameters: beta, gamma");
    }

    // Extract initial conditions
    const S0 = spec.initial_conditions.S;
    const I0 = spec.initial_conditions.I;
    const R0 = spec.initial_conditions.R;

    if (S0 === undefined || I0 === undefined || R0 === undefined) {
      throw new Error("Missing required initial conditions: S, I, R");
    }

    // Extract time span
    const start = spec.time_span.start;
    const end = spec.time_span.end;
    // Increase default steps for better precision
    const steps = spec.time_span.steps || 400;
    const dt = (end - start) / steps;

    // Initialize state
    let t = start;
    let S = S0;
    let I = I0;
    let R = R0;

    const data: Array<Record<string, number | string>> = [];
    
    // Push initial state
    data.push({ time: t, S, I, R });

    // RK4 Solver
    for (let i = 0; i < steps; i++) {
      const k1_S = -beta * S * I;
      const k1_I = beta * S * I - gamma * I;
      const k1_R = gamma * I;

      const S_k2 = S + 0.5 * dt * k1_S;
      const I_k2 = I + 0.5 * dt * k1_I;
      // const R_k2 = R + 0.5 * dt * k1_R; // Not needed for calculation

      const k2_S = -beta * S_k2 * I_k2;
      const k2_I = beta * S_k2 * I_k2 - gamma * I_k2;
      const k2_R = gamma * I_k2;

      const S_k3 = S + 0.5 * dt * k2_S;
      const I_k3 = I + 0.5 * dt * k2_I;
      // const R_k3 = R + 0.5 * dt * k2_R;

      const k3_S = -beta * S_k3 * I_k3;
      const k3_I = beta * S_k3 * I_k3 - gamma * I_k3;
      const k3_R = gamma * I_k3;

      const S_k4 = S + dt * k3_S;
      const I_k4 = I + dt * k3_I;
      // const R_k4 = R + dt * k3_R;

      const k4_S = -beta * S_k4 * I_k4;
      const k4_I = beta * S_k4 * I_k4 - gamma * I_k4;
      const k4_R = gamma * I_k4;

      S = S + (dt / 6) * (k1_S + 2 * k2_S + 2 * k3_S + k4_S);
      I = I + (dt / 6) * (k1_I + 2 * k2_I + 2 * k3_I + k4_I);
      R = R + (dt / 6) * (k1_R + 2 * k2_R + 2 * k3_R + k4_R);
      t = t + dt;

      // Ensure non-negative populations (numerical stability)
      // Use a small epsilon to avoid hard 0s if that's what the user dislikes, 
      // but mathematically 0 is correct. 
      // However, for log plots or division, 0 can be problematic.
      // Let's keep 0 but ensure we don't drift negative.
      S = Math.max(0, S);
      I = Math.max(0, I);
      R = Math.max(0, R);

      data.push({ 
        time: Number(t.toFixed(2)), 
        S: Number(S.toFixed(6)), // Increased precision
        I: Number(I.toFixed(6)), 
        R: Number(R.toFixed(6)) 
      });
    }

    // Calculate metrics
    const maxI = Math.max(...data.map(d => d.I as number));
    const maxITime = data.find(d => d.I === maxI)?.time as number;
    const finalR = data[data.length - 1].R as number;

    const metrics = {
      peak_infection: maxI,
      peak_time: maxITime,
      total_recovered: finalR
    };

    const summary = `SIR Simulation completed. Peak infection of ${(maxI * 100).toFixed(1)}% at t=${maxITime.toFixed(1)}. Final recovered: ${(finalR * 100).toFixed(1)}%.`;

    return {
      status: "success",
      message: "Simulation completed successfully",
      data,
      metrics,
      summary,
      columns: ["time", "S", "I", "R"]
    };

  } catch (error) {
    console.error("Simulation error:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown simulation error",
      data: []
    };
  }
}
