# Generative UI with Live Controls - Implementation Guide

## Overview

We've implemented **Live Controls** for SIR epidemic simulations using AI SDK's Generative UI pattern. This allows users to:
1. Ask the AI to run a simulation
2. Get an interactive visualization with sliders
3. Adjust parameters (beta, gamma) and see **instant updates** (no server requests!)
4. Explore different scenarios in real-time

## Architecture: The "Shared Logic Pattern"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. USER: "Run a 120-day SIR simulation with beta=0.25"       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. AI MODEL (GPT-4): Calls simulate_model tool                │
│     Parameters: { beta: 0.25, gamma: 0.1, S0: 0.99, ... }     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. SERVER (API Route): Returns UI config (NOT full data!)    │
│     {                                                           │
│       _meta: {                                                  │
│         ui: "interactive_simulation",                          │
│         config: { initialParameters, initialState, ... }       │
│       },                                                        │
│       summary: "Created interactive SIR simulation..."         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CLIENT (ToolCallDisplay): Renders InteractiveSimulation   │
│     - Shows chart with S, I, R curves                          │
│     - Shows sliders for beta and gamma                         │
│     - Shows R₀, peak infection, total infected                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. USER: Drags beta slider from 0.25 → 0.35                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CLIENT (lib/simulation/sir-model.ts):                      │
│     - Runs runSIRSimulation() INSTANTLY in browser            │
│     - No API call, no server, no AI                            │
│     - Pure TypeScript math (RK4 integration)                   │
│     - Updates chart in ~1-5ms                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Files

### 1. Shared Simulation Logic (No Dependencies!)
**`lib/simulation/sir-model.ts`**
- Pure TypeScript/Math functions
- Works on both server AND client
- No React, no Node.js, no database
- Implements RK4 (Runge-Kutta 4th order) for accurate ODE solving
- Key functions:
  - `runSIRSimulation()` - Main simulation engine
  - `calculateR0()` - Basic reproduction number
  - `calculatePeakInfection()` - Find peak
  - `calculateFinalSize()` - Total infected

### 2. Interactive Component (Client-Side)
**`components/simulation/InteractiveSimulation.tsx`**
- React component with live sliders
- Uses `useMemo` to recalculate on parameter change
- Recharts for smooth visualization
- Shows:
  - S, I, R curves over time
  - R₀ metric (epidemic will spread if > 1)
  - Peak infection time and percentage
  - Total infected percentage
  - Model equations
  - Live controls with range validation

### 3. AI Tool (Server-Side)
**`app/api/chat/route.ts` - `simulate_model` tool**
- Simplified parameters (no complex spec object):
  - `beta` (0.05-0.5): Infection rate
  - `gamma` (0.02-0.3): Recovery rate
  - `S0, I0, R0` (0-1): Initial conditions
  - `timeEnd` (10-500): Simulation duration
  - `timeSteps` (50-500): Data points
- Returns UI config (NOT full data):
  ```json
  {
    "_meta": {
      "ui": "interactive_simulation",
      "config": { ... }
    },
    "summary": "Created interactive SIR simulation..."
  }
  ```

### 4. Display Component (Client-Side)
**`components/chat/ToolCallDisplay.tsx`**
- Detects `_meta.ui === "interactive_simulation"`
- Renders `<InteractiveSimulation />` component
- Passes config from tool result
- Shows summary text above component

## How to Use

### User Experience:
1. User asks: *"Run a 120-day SIR simulation with beta=0.25 and gamma=0.1"*
2. AI calls the tool (loading spinner shows)
3. Interactive component appears with chart and sliders
4. User drags slider: **Instant update!** (1-5ms)
5. User explores: "What if beta is higher?" → Drag → See result
6. No need to ask AI again - explore freely!

### Toggle Simulation Tool:
In the chat UI, make sure the **"Simulation MCP"** toggle is **ON** (enabled).

## Benefits

### Before (Snapshot Approach):
- ❌ User asks for simulation
- ❌ Server runs full simulation (100-200+ data points)
- ❌ Returns huge JSON payload
- ❌ To change parameters: Ask AI again → New request → Wait 5-10s
- ❌ Limited exploration

### After (Live Controls):
- ✅ User asks for simulation
- ✅ Server returns tiny config (~100 bytes)
- ✅ Client runs initial simulation (~10ms)
- ✅ To change parameters: Drag slider → See result instantly (~1-5ms)
- ✅ Unlimited exploration, zero cost

### Performance Comparison:
| Action | Snapshot | Live Controls |
|--------|----------|---------------|
| Initial load | ~500ms-2s | ~500ms-2s |
| Parameter change | **~5-10s** (new AI request) | **~1-5ms** (local calc) |
| Server cost | High (every change) | Low (once) |
| User experience | Slow, frustrating | Fast, delightful |

## Technical Details

### Why RK4 Integration?
We use **Runge-Kutta 4th Order (RK4)** instead of simple Euler's method because:
- More accurate for stiff ODEs
- Better stability over long time periods
- Industry standard for ODE solving
- Fast enough for real-time browser calculation

### Why Pure TypeScript?
The simulation logic is written in **pure TypeScript** (no dependencies) so it can run:
- In Node.js (server API routes)
- In the browser (client components)
- In Web Workers (future optimization)
- In React Native (mobile apps)
- Anywhere JavaScript runs!

### Data Flow:
```typescript
// 1. AI Tool returns config
{
  _meta: {
    ui: "interactive_simulation",
    config: {
      initialParameters: { beta: 0.25, gamma: 0.1 },
      initialState: { S: 0.99, I: 0.01, R: 0 },
      timeEnd: 120,
      timeSteps: 200
    }
  }
}

// 2. Component receives config
<InteractiveSimulation
  initialParameters={{ beta: 0.25, gamma: 0.1 }}
  initialState={{ S: 0.99, I: 0.01, R: 0 }}
  timeEnd={120}
  timeSteps={200}
/>

// 3. User drags slider → triggers useMemo
const simulationData = useMemo(() => {
  return runSIRSimulation({
    parameters, // { beta: 0.35, gamma: 0.1 } <- NEW VALUE
    initialState,
    timeEnd,
    timeSteps,
  });
}, [parameters]); // Re-runs when parameters change

// 4. Chart updates instantly
<LineChart data={simulationData} />
```

## Future Enhancements

### 1. More Models:
- SEIR (add Exposed state)
- SIRS (add re-susceptibility)
- Age-structured models
- Spatial models (geographic spread)

### 2. More Parameters:
- Population size slider
- Initial infected slider
- Time range slider

### 3. Performance:
- Web Workers for heavy calculations
- Debouncing for rapid slider changes
- Progressive rendering for long simulations

### 4. Export:
- Download CSV data
- Download PNG chart
- Share simulation URL

### 5. Comparison:
- Side-by-side comparisons
- Overlay multiple scenarios
- Parameter sweep animations

## Troubleshooting

### Simulation toggle is OFF
**Problem**: AI generates text instead of calling tool
**Solution**: Turn ON the "Simulation MCP" toggle in the chat UI

### Chart doesn't update when dragging slider
**Problem**: `useMemo` dependencies not set correctly
**Solution**: Check that `parameters` is in dependency array

### Error: "Initial conditions must sum to 1.0"
**Problem**: S0 + I0 + R0 ≠ 1.0
**Solution**: Adjust values so they sum to exactly 1.0

### Slider values look wrong
**Problem**: Min/max/step values incorrect
**Solution**: Check Slider component props:
- Beta: min=0.05, max=0.5, step=0.01
- Gamma: min=0.02, max=0.3, step=0.01

## Example Scenarios

### Scenario 1: Fast-Spreading Epidemic
```typescript
beta: 0.4   (high infection rate)
gamma: 0.1  (slow recovery)
→ R₀ = 4.0 (will spread rapidly)
```

### Scenario 2: Slow-Spreading Epidemic
```typescript
beta: 0.15  (low infection rate)
gamma: 0.1  (slow recovery)
→ R₀ = 1.5 (will spread slowly)
```

### Scenario 3: Dying Out
```typescript
beta: 0.08  (very low infection rate)
gamma: 0.1  (slow recovery)
→ R₀ = 0.8 (will die out)
```

### Scenario 4: Fast Recovery
```typescript
beta: 0.25  (moderate infection)
gamma: 0.25 (very fast recovery)
→ R₀ = 1.0 (critical threshold)
```

## Conclusion

This implementation demonstrates the power of **Generative UI** with **Live Controls**:
1. AI provides initial parameters
2. Client renders interactive component
3. User explores freely without AI
4. Instant feedback (~1000x faster than server requests)

This pattern can be applied to:
- Any simulation or model
- Interactive data visualization
- Parameter tuning interfaces
- Scientific computing tools
- Educational demonstrations

**The key insight**: Move computation to the client when possible, use the server (AI) only for initial setup and configuration.

