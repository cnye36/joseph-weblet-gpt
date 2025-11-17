import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parameters } = body;

    const simulationMcpUrl = process.env.SIMULATION_MCP_URL || 'https://simulator-mcp-server.onrender.com/mcp';

    const response = await fetch(simulationMcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'simulate_model',
          arguments: {
            spec: {
              domain: 'epidemiology',
              model_type: 'SIR',
              parameters: {
                beta: parameters.beta || 0.3,
                gamma: parameters.gamma || 0.1
              },
              initial_conditions: {
                S: 0.99,
                I: 0.01,
                R: 0
              },
              time_span: {
                start: 0,
                end: 160,
                steps: parameters.steps || 100
              },
              return_data: true,
              save_artifacts: false
            }
          }
        }
      })
    });

    const text = await response.text();

    // Parse SSE format
    const lines = text.split('\n');
    const dataLine = lines.find(line => line.startsWith('data: '));

    if (!dataLine) {
      return NextResponse.json(
        { error: 'No data in response from simulation server' },
        { status: 500 }
      );
    }

    const jsonData = JSON.parse(dataLine.substring(6));

    if (jsonData.error) {
      return NextResponse.json(
        { error: jsonData.error.message },
        { status: 500 }
      );
    }

    // Extract simulation result
    const result = jsonData.result._meta?.result ||
                   JSON.parse(jsonData.result.content[0].text);

    if (result.status !== 'success') {
      return NextResponse.json(
        { error: result.message },
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
