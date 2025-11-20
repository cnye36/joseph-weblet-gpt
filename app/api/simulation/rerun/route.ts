import { NextRequest, NextResponse } from 'next/server';
import { runSimulation } from '@/lib/simulation-tool';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parameters, originalArgs } = body;

    // Extract spec from original args if provided, otherwise use defaults
    const originalSpec = originalArgs?.spec as
      | {
          domain?: string;
          model_type?: string;
          parameters?: Record<string, number>;
          initial_conditions?: Record<string, number>;
          time_span?: { start?: number; end?: number; steps?: number };
        }
      | undefined;

    // Construct the simulation spec
    const spec = {
      domain: originalSpec?.domain || "epidemiology",
      model_type: originalSpec?.model_type || "SIR",
      parameters: {
        beta: parameters.beta ?? originalSpec?.parameters?.beta ?? 0.3,
        gamma: parameters.gamma ?? originalSpec?.parameters?.gamma ?? 0.1,
      },
      initial_conditions: {
        S: parameters.S ?? originalSpec?.initial_conditions?.S ?? 0.99,
        I: parameters.I ?? originalSpec?.initial_conditions?.I ?? 0.01,
        R: parameters.R ?? originalSpec?.initial_conditions?.R ?? 0,
      },
      time_span: {
        start: originalSpec?.time_span?.start ?? 0,
        end: originalSpec?.time_span?.end ?? 160,
        steps: originalSpec?.time_span?.steps ?? 100,
      },
      return_data: true,
      save_artifacts: false,
    };

    // Run the simulation directly
    const result = await runSimulation(spec);

    if (result.status !== 'success') {
      return NextResponse.json(
        { error: result.message || "Simulation failed" },
        { status: 500 }
      );
    }

    // Return the simulation data
    return NextResponse.json({
      data: result.data,
      metrics: result.metrics,
      summary: result.summary
    });

  } catch (error) {
    console.error('Simulation rerun error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run simulation' },
      { status: 500 }
    );
  }
}
