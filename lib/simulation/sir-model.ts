/**
 * Shared SIR Model Simulation Logic
 * 
 * This file contains pure TypeScript/Math logic with NO server dependencies.
 * It can be imported and run on both server (API routes) and client (browser).
 * 
 * This enables LIVE CONTROLS - the browser can recalculate instantly when
 * the user drags a slider, without needing to call the server.
 */

export interface SIRParameters {
  beta: number;  // Infection rate (0.1 - 0.5)
  gamma: number; // Recovery rate (0.05 - 0.2)
}

export interface SIRState {
  S: number; // Susceptible (0-1)
  I: number; // Infected (0-1)
  R: number; // Recovered (0-1)
}

export interface SIRDataPoint {
  time: number;
  S: number;
  I: number;
  R: number;
}

export interface SIRSimulationConfig {
  parameters: SIRParameters;
  initialState: SIRState;
  timeEnd: number;
  timeSteps?: number;
}

/**
 * SIR Model Differential Equations
 * dS/dt = -beta * S * I
 * dI/dt = beta * S * I - gamma * I
 * dR/dt = gamma * I
 */
function sirDerivatives(
  state: SIRState,
  params: SIRParameters
): SIRState {
  const { S, I, R } = state;
  const { beta, gamma } = params;

  return {
    S: -beta * S * I,
    I: beta * S * I - gamma * I,
    R: gamma * I,
  };
}

/**
 * Runge-Kutta 4th Order Integration Step
 * More accurate than Euler's method
 */
function rk4Step(
  state: SIRState,
  params: SIRParameters,
  dt: number
): SIRState {
  // k1 = f(t, y)
  const k1 = sirDerivatives(state, params);

  // k2 = f(t + dt/2, y + k1*dt/2)
  const state2: SIRState = {
    S: state.S + k1.S * dt * 0.5,
    I: state.I + k1.I * dt * 0.5,
    R: state.R + k1.R * dt * 0.5,
  };
  const k2 = sirDerivatives(state2, params);

  // k3 = f(t + dt/2, y + k2*dt/2)
  const state3: SIRState = {
    S: state.S + k2.S * dt * 0.5,
    I: state.I + k2.I * dt * 0.5,
    R: state.R + k2.R * dt * 0.5,
  };
  const k3 = sirDerivatives(state3, params);

  // k4 = f(t + dt, y + k3*dt)
  const state4: SIRState = {
    S: state.S + k3.S * dt,
    I: state.I + k3.I * dt,
    R: state.R + k3.R * dt,
  };
  const k4 = sirDerivatives(state4, params);

  // y_next = y + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
  return {
    S: state.S + (dt / 6) * (k1.S + 2 * k2.S + 2 * k3.S + k4.S),
    I: state.I + (dt / 6) * (k1.I + 2 * k2.I + 2 * k3.I + k4.I),
    R: state.R + (dt / 6) * (k1.R + 2 * k2.R + 2 * k3.R + k4.R),
  };
}

/**
 * Run SIR Model Simulation
 * 
 * This is the CORE function that both server and client use.
 * When user drags a slider, the client calls this directly for instant feedback.
 * 
 * @param config - Simulation configuration
 * @returns Array of data points over time
 */
export function runSIRSimulation(config: SIRSimulationConfig): SIRDataPoint[] {
  const { parameters, initialState, timeEnd, timeSteps = 200 } = config;
  
  // Validate inputs
  if (parameters.beta < 0 || parameters.beta > 1) {
    throw new Error(`Invalid beta: ${parameters.beta}. Must be between 0 and 1.`);
  }
  if (parameters.gamma < 0 || parameters.gamma > 1) {
    throw new Error(`Invalid gamma: ${parameters.gamma}. Must be between 0 and 1.`);
  }
  
  const sum = initialState.S + initialState.I + initialState.R;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error(`Initial state must sum to 1.0, got ${sum}`);
  }

  const dt = timeEnd / timeSteps;
  const results: SIRDataPoint[] = [];

  let state = { ...initialState };
  let time = 0;

  // Add initial point
  results.push({ time, ...state });

  // Run simulation
  for (let step = 1; step <= timeSteps; step++) {
    state = rk4Step(state, parameters, dt);
    time = step * dt;
    
    // Clamp values to [0, 1] to prevent numerical errors
    state.S = Math.max(0, Math.min(1, state.S));
    state.I = Math.max(0, Math.min(1, state.I));
    state.R = Math.max(0, Math.min(1, state.R));
    
    results.push({ time, ...state });
  }

  return results;
}

/**
 * Calculate R0 (Basic Reproduction Number)
 * R0 = beta / gamma
 * R0 > 1: epidemic will spread
 * R0 < 1: epidemic will die out
 */
export function calculateR0(params: SIRParameters): number {
  return params.beta / params.gamma;
}

/**
 * Calculate peak infection metrics
 */
export function calculatePeakInfection(data: SIRDataPoint[]): {
  peakTime: number;
  peakInfected: number;
  peakIndex: number;
} {
  let peakInfected = 0;
  let peakTime = 0;
  let peakIndex = 0;

  data.forEach((point, index) => {
    if (point.I > peakInfected) {
      peakInfected = point.I;
      peakTime = point.time;
      peakIndex = index;
    }
  });

  return { peakTime, peakInfected, peakIndex };
}

/**
 * Calculate final epidemic size (total infected)
 */
export function calculateFinalSize(data: SIRDataPoint[]): number {
  // Final R value represents total who were infected
  const lastPoint = data[data.length - 1];
  return lastPoint.R;
}

