import { runSimulation } from '../lib/simulation-tool';

async function testSimulation() {
  console.log("🧪 Testing Internal Simulation Tool...");

  const spec = {
    domain: "epidemiology",
    model_type: "SIR",
    parameters: {
      beta: 0.3,
      gamma: 0.1
    },
    initial_conditions: {
      S: 0.99,
      I: 0.01,
      R: 0
    },
    time_span: {
      start: 0,
      end: 160,
      steps: 100
    },
    return_data: true
  };

  try {
    console.log("Running simulation with spec:", JSON.stringify(spec, null, 2));
    // @ts-ignore
    const result = await runSimulation(spec);

    if (result.status === "success") {
      console.log("✅ Simulation successful!");
      console.log(`   Data points: ${result.data.length}`);
      console.log(`   Metrics:`, result.metrics);
      console.log(`   Summary:`, result.summary);
      
      // Check first and last data points
      console.log("   First point:", result.data[0]);
      console.log("   Last point:", result.data[result.data.length - 1]);
    } else {
      console.error("❌ Simulation failed:", result.message);
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

testSimulation();
