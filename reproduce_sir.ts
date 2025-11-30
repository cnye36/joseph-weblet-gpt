
import { runSimulation } from './lib/simulation/core';

const config = {
  model_type: "SIR",
  domain: "epidemiology",
  parameters: {
    beta: 0.3,
    gamma: 0.1
  },
  initial_conditions: {
    S: 990,
    I: 10,
    R: 0
  },
  time_span: {
    start: 0,
    end: 100,
    steps: 100
  }
};

const result = runSimulation(config as any);
console.log("Status:", result.status);
console.log("First 5 data points:", result.data.slice(0, 5));
