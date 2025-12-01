import { z } from "zod";

export const SimulationSchema = z.discriminatedUnion("model_type", [
  z.object({
    model_type: z.literal("SIR"),
    domain: z.enum(["epidemiology", "custom"]).default("epidemiology"),
    parameters: z.object({
      beta: z.number().describe("Infection rate"),
      gamma: z.number().describe("Recovery rate"),
    }),
    initial_conditions: z.object({
      S: z.number(),
      I: z.number(),
      R: z.number(),
    }),
    time_span: z.object({
      start: z.number().default(0),
      end: z.number(),
      steps: z.number().default(100),
    }),
  }),
  z.object({
    model_type: z.literal("Logistic"),
    domain: z.enum(["epidemiology", "physics", "custom"]).default("epidemiology"),
    parameters: z.object({
      r: z.number().describe("Growth rate"),
      K: z.number().describe("Carrying capacity"),
    }),
    initial_conditions: z.object({
      P: z.number().describe("Initial population"),
    }),
    time_span: z.object({
      start: z.number().default(0),
      end: z.number(),
      steps: z.number().default(100),
    }),
  }),
  z.object({
    model_type: z.literal("Projectile"),
    domain: z.enum(["physics", "custom"]).default("physics"),
    parameters: z.object({
      velocity: z.number().describe("Initial velocity (m/s)"),
      angle: z.number().describe("Launch angle (degrees)"),
      g: z.number().default(9.81).describe("Gravity (m/s^2)"),
    }),
    initial_conditions: z.object({
      x: z.number().default(0).describe("Initial x position"),
      y: z.number().default(0).describe("Initial y position"),
    }),
    time_span: z.object({
      start: z.number().default(0),
      end: z.number().describe("Simulation duration (s)"),
      steps: z.number().default(100),
    }),
  }),
]);

export type SimulationConfig = z.infer<typeof SimulationSchema>;

export type SimulationResult = {
  status: "success" | "error";
  message: string;
  summary?: string;
  metrics?: Record<string, number>;
  columns: string[];
  data: Record<string, number>[];
};

type DerivativeFunction = (t: number, state: number[], params: Record<string, number>) => number[];

/**
 * Generic Runge-Kutta 4th Order Solver
 */
function rk4(
  derivs: DerivativeFunction,
  t0: number,
  y0: number[],
  tEnd: number,
  steps: number,
  params: Record<string, number>
): { t: number[]; y: number[][] } {
  const dt = (tEnd - t0) / steps;
  const tPoints: number[] = [];
  const yPoints: number[][] = [];

  let t = t0;
  let y = [...y0];

  tPoints.push(t);
  yPoints.push([...y]);

  for (let i = 0; i < steps; i++) {
    const k1 = derivs(t, y, params);
    const k2 = derivs(
      t + dt / 2,
      y.map((val, idx) => val + (dt / 2) * k1[idx]),
      params
    );
    const k3 = derivs(
      t + dt / 2,
      y.map((val, idx) => val + (dt / 2) * k2[idx]),
      params
    );
    const k4 = derivs(
      t + dt,
      y.map((val, idx) => val + dt * k3[idx]),
      params
    );

    y = y.map((val, idx) => val + (dt / 6) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx]));
    t += dt;

    tPoints.push(t);
    yPoints.push([...y]);
  }

  return { t: tPoints, y: yPoints };
}

/**
 * SIR Model Logic
 */
const sirDerivs: DerivativeFunction = (t, state, params) => {
  const [S, I, R] = state;
  const { beta, gamma } = params;
  
  const N = S + I + R;
  
  // Avoid division by zero if population is 0 (unlikely but safe)
  const invN = N > 0 ? 1 / N : 0;

  const dS = -beta * S * I * invN;
  const dI = beta * S * I * invN - gamma * I;
  const dR = gamma * I;
  
  return [dS, dI, dR];
};

export function simulateSIR(config: Extract<SimulationConfig, { model_type: "SIR" }>): SimulationResult {
  try {
    const { parameters, initial_conditions, time_span } = config;
    const { beta, gamma } = parameters;
    const { S, I, R } = initial_conditions;
    
    // Validate constraints
    if (Math.abs(S + I + R - 1.0) > 0.01) {
      // Auto-normalize if close, or just warn? For now, let's proceed but maybe normalize
      // const total = S + I + R;
      // S /= total; I /= total; R /= total;
    }

    const { t, y } = rk4(
      sirDerivs,
      time_span.start,
      [S, I, R],
      time_span.end,
      time_span.steps,
      { beta, gamma }
    );

    const data = t.map((time, idx) => ({
      t: Number(time.toFixed(2)),
      S: Number(y[idx][0].toFixed(4)),
      I: Number(y[idx][1].toFixed(4)),
      R: Number(y[idx][2].toFixed(4)),
    }));

    // Calculate metrics
    let maxI = 0;
    let tPeak = 0;
    data.forEach((point) => {
      if (point.I > maxI) {
        maxI = point.I;
        tPeak = point.t;
      }
    });

    return {
      status: "success",
      message: "Simulation completed successfully",
      summary: `Peak infection of ${(maxI * 100).toFixed(1)}% occurred at day ${tPeak.toFixed(1)}.`,
      metrics: {
        I_peak: maxI,
        t_peak: tPeak,
      },
      columns: ["t", "S", "I", "R"],
      data,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error in SIR simulation",
      columns: [],
      data: [],
    };
  }
}

/**
 * Logistic Growth Model Logic
 */
const logisticDerivs: DerivativeFunction = (t, state, params) => {
  const [P] = state;
  const { r, K } = params;
  
  const dP = r * P * (1 - P / K);
  
  return [dP];
};

export function simulateLogistic(config: Extract<SimulationConfig, { model_type: "Logistic" }>): SimulationResult {
  try {
    const { parameters, initial_conditions, time_span } = config;
    const { r, K } = parameters;
    const { P } = initial_conditions;

    const { t, y } = rk4(
      logisticDerivs,
      time_span.start,
      [P],
      time_span.end,
      time_span.steps,
      { r, K }
    );

    const data = t.map((time, idx) => ({
      t: Number(time.toFixed(2)),
      P: Number(y[idx][0].toFixed(2)),
    }));

    const finalP = data[data.length - 1].P;
    
    return {
      status: "success",
      message: "Simulation completed successfully",
      summary: `Population grew from ${P} to ${finalP} (Carrying Capacity: ${K}).`,
      metrics: {
        P_initial: P,
        P_final: finalP,
        K,
      },
      columns: ["t", "P"],
      data,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error in Logistic simulation",
      columns: [],
      data: [],
    };
  }
}

/**
 * Projectile Motion Model Logic
 */
const projectileDerivs: DerivativeFunction = (t, state, params) => {
  // state: [x, y, vx, vy]
  const [, , vx, vy] = state;
  const { g } = params;

  const dx = vx;
  const dy = vy;
  const dvx = 0;
  const dvy = -g;

  return [dx, dy, dvx, dvy];
};

export function simulateProjectile(
  config: Extract<SimulationConfig, { model_type: "Projectile" }>
): SimulationResult {
  try {
    const { parameters, initial_conditions, time_span } = config;
    const { velocity, angle, g } = parameters;
    const { x: x0, y: y0 } = initial_conditions;

    const rad = (angle * Math.PI) / 180;
    const vx0 = velocity * Math.cos(rad);
    const vy0 = velocity * Math.sin(rad);

    const { t, y } = rk4(
      projectileDerivs,
      time_span.start,
      [x0, y0, vx0, vy0],
      time_span.end,
      time_span.steps,
      { g }
    );

    const data = t.map((time, idx) => ({
      t: Number(time.toFixed(2)),
      x: Number(y[idx][0].toFixed(2)),
      y: Number(y[idx][1].toFixed(2)),
      vx: Number(y[idx][2].toFixed(2)),
      vy: Number(y[idx][3].toFixed(2)),
    }));

    // Find max height and range
    let maxY = -Infinity;
    let range = 0;
    data.forEach((p) => {
      if (p.y > maxY) maxY = p.y;
      if (p.y >= 0) range = p.x; // Approximate range where y >= 0
    });

    return {
      status: "success",
      message: "Simulation completed successfully",
      summary: `Projectile reached max height of ${maxY.toFixed(
        2
      )}m and range of approx ${range.toFixed(2)}m.`,
      metrics: {
        max_height: maxY,
        range: range,
      },
      columns: ["t", "x", "y", "vx", "vy"],
      data,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unknown error in Projectile simulation",
      columns: [],
      data: [],
    };
  }
}

/**
 * Main Entry Point
 */
export function runSimulation(config: SimulationConfig): SimulationResult {
  switch (config.model_type) {
    case "SIR":
      return simulateSIR(config);
    case "Logistic":
      return simulateLogistic(config);
    case "Projectile":
      return simulateProjectile(config);
    default:
      return {
        status: "error",
        message: `Model type ${
          (config as { model_type: string }).model_type
        } not implemented yet.`,
        columns: [],
        data: [],
      };
  }
}
