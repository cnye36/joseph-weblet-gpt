export function constructSystemPrompt(
  baseSystemPrompt: string,
  tools: Record<string, any>
): string {
  let systemPrompt = baseSystemPrompt || "";
  
  if (Object.keys(tools).length > 0) {
    const toolNames = Object.keys(tools);
    const hasSimulation = toolNames.some((name) => name.includes("simulate"));
    const hasArxiv = toolNames.some(
      (name) =>
        name.includes("arxiv") ||
        name.includes("paper") ||
        name.includes("search")
    );

    let toolInstructions =
      "\n\n=== IMPORTANT: TOOL USAGE INSTRUCTIONS ===\n\n";
    toolInstructions +=
      "You have access to specialized tools that provide REAL data. You MUST use these tools instead of generating hypothetical examples.\n\n";

    if (hasSimulation) {
      toolInstructions += "**SIMULATION TOOL (simulate_model):**\n";
      toolInstructions +=
        '- USE IMMEDIATELY when users ask to: "simulate", "model", "optimize", "analyze performance", "run a simulation", "test parameters", or "compare scenarios"\n';
      toolInstructions +=
        "- This tool runs ACTUAL computational simulations with real numerical results\n";
      toolInstructions +=
        "- DO NOT generate fake data - always call this tool for simulation requests\n";
      toolInstructions +=
        '- Common triggers: "simulate X", "optimize Y", "model Z", "10-step process", "parameter analysis"\n\n';

      toolInstructions += "Required format:\n";
      toolInstructions +=
        '{\n  "spec": {\n    "domain": "epidemiology",\n    "model_type": "SIR",\n';
      toolInstructions +=
        '    "parameters": { "beta": 0.3, "gamma": 0.1 },\n';
      toolInstructions +=
        '    "initial_conditions": { "S": 0.99, "I": 0.01, "R": 0 },\n';
      toolInstructions +=
        '    "time_span": { "start": 0, "end": 160, "steps": 100 },\n';
      toolInstructions += '    "return_data": true\n  }\n}\n\n';

      toolInstructions +=
        "- parameters: { beta: 0.1-0.5 (infection rate), gamma: 0.05-0.2 (recovery rate) }\n";
      toolInstructions +=
        "- initial_conditions: { S: 0.99, I: 0.01, R: 0 } (must sum to 1.0)\n";
      toolInstructions +=
        "- time_span: { start: 0, end: 100-200, steps: 10-100 }\n";
      toolInstructions += "- return_data: true (to get data points)\n\n";

      toolInstructions += "For N-step processes:\n";
      toolInstructions +=
        "- Set time_span.steps to N (e.g., 10-step process → steps: 10)\n";
      toolInstructions +=
        "- Interpret results creatively: S=remaining potential, I=active process, R=completed\n\n";

      toolInstructions +=
        "**CRITICAL: How to present simulation results:**\n\n";
      toolInstructions +=
        "After calling the simulation tool, ALWAYS provide a comprehensive explanation that includes:\n\n";
      toolInstructions +=
        "1. **Parameter Summary**: Restate the simulation parameters you used\n";
      toolInstructions +=
        "2. **Result Interpretation**: Explain what the simulation shows and key trends\n";
      toolInstructions +=
        "3. **Chart Description**: Describe what users will see in the interactive chart\n";
      toolInstructions +=
        "4. **Key Insights**: Highlight important findings or patterns in the data\n\n";
      toolInstructions += "**MANDATORY RESPONSE FORMAT:**\n";
      toolInstructions +=
        "After every simulation tool call, you MUST write a complete paragraph explaining the results.\n";
      toolInstructions +=
        "Example: 'I ran an SIR epidemic simulation with infection rate β=0.3 and recovery rate γ=0.1. The interactive chart shows how the susceptible population (blue) decreases while infected (red) and recovered (green) populations change over time. The peak infection occurs around day 50, with the epidemic lasting approximately 150 days.'\n\n";
      toolInstructions += "**CONVERSATIONAL CONTINUATION:**\n";
      toolInstructions +=
        "After explaining results, invite follow-up questions: 'Would you like me to run another simulation with different parameters, or would you like me to explain any specific aspect of these results?'\n\n";
    }

    if (hasArxiv) {
      toolInstructions += "**ARXIV RESEARCH TOOLS:**\n";
      toolInstructions +=
        "- USE when users ask about: research papers, academic studies, scientific publications, recent advances, or specific authors\n";
      toolInstructions +=
        "- Tools available: search_papers, get_paper_details, get_recent_papers\n";
      toolInstructions +=
        "- These retrieve REAL published research from arXiv.org\n";
      toolInstructions +=
        '- Common triggers: "find papers about", "research on", "recent studies", "what does the literature say"\n\n';
      toolInstructions += "**CRITICAL: PAPER LINK REQUIREMENTS**\n";
      toolInstructions +=
        "- EVERY paper you mention MUST include a clickable markdown link in your text response\n";
      toolInstructions +=
        "- When the ArXiv tool returns results, examine the structure carefully\n";
      toolInstructions +=
        "- Look for fields like: 'id', 'identifier', 'url', 'link', or 'links' array\n";
      toolInstructions +=
        "- Extract the paper identifier (e.g., '2301.07041' or 'cs/9901002')\n";
      toolInstructions +=
        "- Construct the arXiv URL using: https://arxiv.org/abs/[PAPER_ID]\n";
      toolInstructions +=
        "- Format each paper reference in markdown as: [Paper Title](https://arxiv.org/abs/XXXX.XXXXX)\n";
      toolInstructions +=
        "- Example: If a paper has id='2301.07041' and title='Example Paper', write: [Paper Title](https://arxiv.org/abs/2301.07041)\n";
      toolInstructions +=
        "- NEVER just say 'Link' or 'see link' - ALWAYS include the actual markdown link\n";
      toolInstructions +=
        "- NEVER mention a paper without its clickable link in the same sentence\n";
      toolInstructions +=
        "- If referencing multiple papers, format like: 'Here are relevant papers: [Paper 1](https://arxiv.org/abs/2301.07041), [Paper 2](https://arxiv.org/abs/2302.12345)'\n";
      toolInstructions +=
        "- Every single paper you discuss must have its own clickable markdown link\n";
      toolInstructions +=
        "- Users must be able to click directly on the paper title to access the arXiv page\n\n";
    }

    toolInstructions += "CRITICAL RULES:\n";
    toolInstructions +=
      "1. If a user request matches ANY tool trigger phrase above, call that tool immediately\n";
    toolInstructions +=
      '2. NEVER say "I cannot run simulations" - you CAN via the simulate_model tool\n';
    toolInstructions +=
      "3. NEVER provide hypothetical/made-up simulation results - always use the tool\n";
    toolInstructions += "4. Call the tool FIRST, then explain the results\n";
    toolInstructions +=
      "5. If unsure whether to use a tool, USE IT - real data is always better than examples\n\n";
    toolInstructions += "=== END TOOL INSTRUCTIONS ===\n";

    systemPrompt += toolInstructions;
  }
  
  return systemPrompt;
}
