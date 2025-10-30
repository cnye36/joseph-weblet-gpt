import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    // Generative UI capabilities instruction - same as in bots.ts
    const GENERATIVE_UI_INSTRUCTIONS = `

## GENERATIVE UI CAPABILITIES
You have access to powerful visual rendering capabilities. Use these to enhance your responses:

### 1. MERMAID DIAGRAMS
Create interactive diagrams using mermaid syntax. Supported types:
- **Gantt Charts**: Perfect for project timelines and schedules
- **Flowcharts**: For processes, workflows, and decision trees
- **Sequence Diagrams**: For interactions and communication flows
- **Class Diagrams**: For system architecture and relationships
- **State Diagrams**: For state machines and transitions
- **Pie Charts**: For proportions and distributions
- **Git Graphs**: For version control visualization

**CRITICAL**: Each line must have proper indentation (4 spaces) and NO extra spaces after colons.

**Gantt Chart Example** (COPY THIS EXACT FORMAT):
\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1           :a1, 2024-01-01, 30d
    Task 2           :after a1, 20d
    section Phase 2
    Task 3           :a3, after a1, 15d
\`\`\`

**Flowchart Example**:
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

### 2. ENHANCED TABLES
Create beautiful, sortable tables using markdown syntax:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

Tables automatically support:
- Click-to-sort by any column
- Numeric and alphabetic sorting
- Responsive design
- Professional styling

### 3. CODE BLOCKS
Display code with syntax highlighting for 100+ languages:
\`\`\`python
def hello_world():
    print("Hello, World!")
\`\`\`

Features:
- Automatic language detection
- Line numbers
- One-click copy
- Professional themes

### BEST PRACTICES
- Use Gantt charts for ANY timeline, schedule, or project planning request
- Use flowcharts to explain complex processes or decision trees
- Use tables for structured data, comparisons, or lists with multiple attributes
- Always prefer visual representations over lengthy text descriptions
- Combine multiple visualization types when appropriate`;

    // Create the enhancement prompt for the AI
    const enhancementPrompt = `You are a professional prompt engineer specializing in creating comprehensive system prompts for scientific and technical AI assistants. 

Your task is to transform the following user prompt into a detailed, professional system prompt that follows the patterns of high-quality scientific AI assistants.

ANALYZE the user's prompt and enhance it by adding:

1. **Clear Role Definition**: Define the AI's specific role and expertise area
2. **Structured Workflow**: Create a step-by-step process (numbered steps 1, 2, 3, etc.)
3. **Technical Specifications**: Add specific technical requirements, constraints, and standards
4. **Quality Standards**: Include professional formatting, accuracy requirements, and output expectations
5. **Error Handling**: Add guidelines for handling edge cases and ambiguous situations
6. **Output Format**: Specify clear expectations for response structure and sections
7. **Scientific Rigor**: Ensure the prompt emphasizes accuracy, evidence-based responses, and professional standards

IMPORTANT GUIDELINES:
- Keep the core intent and purpose of the original prompt
- Make it suitable for scientific/technical domains
- Use professional, authoritative language
- Include specific technical requirements where appropriate
- Add quality control measures
- Specify clear output formats
- Include error handling for edge cases
- Make it comprehensive but not overly verbose

USER'S ORIGINAL PROMPT:
"${prompt}"

Create an enhanced system prompt that transforms this into a professional, comprehensive prompt for a scientific/technical AI assistant.`;

    // Use OpenAI API to enhance the prompt
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: enhancementPrompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 2000,
        }),
      }
    );

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const openaiData = await openaiResponse.json();
    const enhancedPrompt = openaiData.choices[0]?.message?.content;

    if (!enhancedPrompt) {
      throw new Error('No enhanced prompt received');
    }

    // Combine the enhanced prompt with the generative UI instructions
    const finalPrompt = enhancedPrompt + GENERATIVE_UI_INSTRUCTIONS;

    return NextResponse.json({ enhancedPrompt: finalPrompt });

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}
