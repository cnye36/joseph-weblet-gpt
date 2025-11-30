
import { runSimulation } from './lib/simulation/core';

const config = {
  model_type: "Projectile",
  domain: "physics",
  parameters: {
    velocity: 50,
    angle: 45,
    g: 9.81
  },
  initial_conditions: {
    x: 0,
    y: 0
  },
  time_span: {
    start: 0,
    end: 10,
    steps: 100
  }
};

const result = runSimulation(config as any);
console.log("Status:", result.status);
if (result.status === "success") {
    console.log("Summary:", result.summary);
    console.log("First 5 data points:", result.data.slice(0, 5));
    // Find peak
    const peak = result.data.reduce((max, p) => p.y > max.y ? p : max, result.data[0]);
    console.log("Peak:", peak);
} else {
    console.error("Error:", result.message);
}
