
import { runSimulation } from './lib/simulation/core';

const config = {
  model_type: "Logistic",
  domain: "epidemiology",
  parameters: {
    r: 0.1,
    K: 1000
  },
  initial_conditions: {
    P: 10
  },
  time_span: {
    start: 0,
    end: 100,
    steps: 100
  }
};

const result = runSimulation(config as any);
console.log("Status:", result.status);
if (result.status === "success") {
    console.log("Summary:", result.summary);
    console.log("First 5 data points:", result.data.slice(0, 5));
    console.log("Last data point:", result.data[result.data.length - 1]);
} else {
    console.error("Error:", result.message);
}
