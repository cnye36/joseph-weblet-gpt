'use server';

import { streamUI } from 'ai/rsc';
import { openrouter } from '@/lib/openrouter';
import { bots, type BotId, defaultBotId } from '@/lib/bots';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { chartToolSchema, type ChartToolConfig } from '@/lib/chart-schemas';
import { SimulationSchema, type SimulationConfig, runSimulation } from '@/lib/simulation/core';
import ChartToolRenderer from '@/components/chat/ChartToolRenderer';
import SimulationRenderer from '@/components/chat/SimulationRenderer';
import { ReactNode } from 'react';

const LoadingChart = () => (
  <div className="animate-pulse p-4 border rounded-lg">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-32 bg-gray-100 rounded"></div>
  </div>
);

const LoadingSimulation = () => (
  <div className="animate-pulse p-4 border rounded-lg">
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-48 bg-gray-100 rounded"></div>
  </div>
);

export async function continueConversation(
  botId: BotId,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  enableSimulation: boolean = false
): Promise<ReactNode> {
  
  // Load bot config
  let bot = bots[botId || defaultBotId];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('bots')
      .select('id, name, description, model, system, temperature')
      .eq('id', botId)
      .maybeSingle();
    if (data) {
      bot = {
        id: botId,
        name: data.name,
        model: data.model,
        system: data.system,
      } as typeof bot;
    }
  } catch (error) {
    console.error('Failed to load bot config from DB:', error);
  }

  const modelSlug = (() => {
    const raw = bot.model || 'openrouter/auto';
    if (raw.includes('/')) return raw;
    return `openai/${raw}`;
  })();

  // Define tools with dynamic simulation toggle
  const tools: any = {
    generate_chart: {
      description: `Generate a chart or diagram. 

CRITICAL: You MUST include all required fields based on chart type.

For LINE/BAR/PIE/AREA charts, you MUST include:
- type: the chart type
- title: chart title
- data: an array of data objects (REQUIRED - do not omit!)
- xKey: the property name for x-axis values
- yKeys: array of property names for y-axis values

For FLOWCHART, you MUST include:
- type: "flowchart"
- title: chart title
- nodes: array of {id, label, shape?}
- edges: array of {from, to, label?}
- direction: "TD" | "LR" | "BT" | "RL"

For GANTT, you MUST include:
- type: "gantt"
- title: chart title
- tasks: array of {id, label, start?, end?, duration?, dependsOn?}`,
      parameters: chartToolSchema,
      generate: async function* (chartData: ChartToolConfig) {
        console.log('=== CHART TOOL EXECUTION ===');
        console.log('Chart Type:', chartData.type);
        console.log('Full Chart Data:', JSON.stringify(chartData, null, 2));
        
        yield <LoadingChart />;
        
        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return <ChartToolRenderer config={chartData} />;
      },
    },
  };

  // Conditionally add simulation tool
  if (enableSimulation) {
    tools.simulate_model = {
      description:
        "Run a scientific simulation. Supported models: 'SIR' (epidemiology), 'Logistic' (population growth), 'Projectile' (physics).",
      parameters: z.object({
        config: SimulationSchema,
      }),
      generate: async function* ({ config }: { config: SimulationConfig }) {
        console.log('=== SIMULATION TOOL EXECUTION ===');
        console.log('Simulation Type:', config.model_type);
        
        yield <LoadingSimulation />;
        
        try {
          const result = runSimulation(config);
          console.log('Simulation result status:', result.status);
          
          return (
            <SimulationRenderer
              initialConfig={config}
              initialResult={result as any}
            />
          );
        } catch (e) {
          console.error('Simulation execution error:', e);
          return (
            <div className="p-4 border border-red-300 bg-red-50 rounded-lg text-red-900">
              Simulation error: {e instanceof Error ? e.message : 'Unknown error'}
            </div>
          );
        }
      },
    };
  }

  const result = await streamUI({
    model: openrouter(modelSlug),
    system: `${bot.system || ''}
    
    IMPORTANT: When you need to generate a chart or diagram, you MUST use the 'generate_chart' tool. 
    - Do NOT output the mermaid code block in your text response. 
    - Do NOT output the chart data in your text response.
    - ONLY call the tool.`,
    messages,
    text: ({ content }) => <div className="prose prose-sm dark:prose-invert max-w-none">{content}</div>,
    tools,
    maxSteps: 5,
  });

  return result.value;
}
