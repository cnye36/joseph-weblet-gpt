# Main App Integration Guide

Complete guide for integrating the Simulation MCP Server into your chat application with Supabase.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Chat App                             │
│  - User Authentication (Supabase Auth)                          │
│  - Chat Management (Supabase DB)                                │
│  - Data Persistence (Supabase Storage/DB)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS Requests (JSON-RPC 2.0)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│              Simulation MCP Server (Render)                      │
│  - Stateless (no sessions, no storage)                          │
│  - Pure computation engine                                       │
│  - Returns simulation data in JSON                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- **Server:** Stateless computation engine - no authentication, no storage, no sessions
- **Your App:** Handles all authentication, persistence, and user management via Supabase
- **Protocol:** JSON-RPC 2.0 over HTTPS

---

## 🔌 Server Endpoint

**Production URL:** `https://simulator-mcp-server.onrender.com/mcp`

**Protocol:** JSON-RPC 2.0 with MCP tool calling convention

---

## 📤 Request Format

### HTTP Headers
```http
POST /mcp HTTP/1.1
Host: simulator-mcp-server.onrender.com
Content-Type: application/json
Accept: application/json, text/event-stream
```

### Request Body Structure
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "simulate_model",
    "arguments": {
      "spec": {
        "domain": "epidemiology",
        "model_type": "SIR",
        "parameters": {
          "beta": 0.3,
          "gamma": 0.1
        },
        "initial_conditions": {
          "S": 0.99,
          "I": 0.01,
          "R": 0
        },
        "time_span": {
          "start": 0,
          "end": 160,
          "steps": 400,
          "preview_mode": false
        },
        "method": "RK45",
        "return_data": true,
        "save_artifacts": false
      }
    }
  }
}
```

**⚠️ Critical:** Arguments must be wrapped in a `"spec"` key!

---

## 📥 Response Format

### Server-Sent Events (SSE) Response
The server returns data as SSE format:
```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}
```

### Parsed Response Structure
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"status\":\"success\",\"message\":\"Simulation completed\",\"summary\":\"...\",\"artifacts\":[],\"metrics\":{...},\"columns\":[\"t\",\"S\",\"I\",\"R\"],\"data\":[...]}"
      }
    ],
    "_meta": {
      "result": {
        "status": "success",
        "message": "Simulation completed",
        "summary": "Peak values: S=0.99, I=0.43, R=0.58",
        "artifacts": [],
        "metrics": {
          "peak_I": 0.4278,
          "time_at_peak_I": 38.5
        },
        "columns": ["t", "S", "I", "R"],
        "data": [
          {"t": 0, "S": 0.99, "I": 0.01, "R": 0},
          {"t": 0.4, "S": 0.9888, "I": 0.0112, "R": 0.0000},
          {"t": 0.8, "S": 0.9876, "I": 0.0124, "R": 0.0000},
          ...
        ]
      }
    }
  }
}
```

---

## 🎯 Extracting Data from Response

### Recommended Approach: Use `_meta.result`
```typescript
async function runSimulation(params: SimulationParams) {
  const response = await fetch('https://simulator-mcp-server.onrender.com/mcp', {
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
          spec: params // Your simulation parameters
        }
      }
    })
  });

  const text = await response.text();
  
  // Parse SSE format
  const lines = text.split('\n');
  let jsonData = null;
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      jsonData = JSON.parse(line.substring(6));
      break;
    }
  }
  
  if (!jsonData) {
    throw new Error('No data in response');
  }
  
  // Check for errors
  if (jsonData.error) {
    throw new Error(jsonData.error.message);
  }
  
  // Extract simulation result
  const result = jsonData.result._meta?.result || 
                 JSON.parse(jsonData.result.content[0].text);
  
  if (result.status !== 'success') {
    throw new Error(result.message);
  }
  
  return {
    data: result.data,           // Array of {t, S, I, R} points
    columns: result.columns,     // ["t", "S", "I", "R"]
    metrics: result.metrics,     // {peak_I: 0.43, time_at_peak_I: 38.5}
    summary: result.summary      // Human-readable summary
  };
}
```

### Alternative: Parse from `content[0].text`
```typescript
const textContent = jsonData.result.content[0].text;
const result = JSON.parse(textContent);

// Now access result.data, result.metrics, etc.
```

---

## 📋 Request Parameters Reference

### Required Parameters

#### `domain` (string)
Model category. Options:
- `"epidemiology"` - Disease spread models (SIR, SEIR, etc.)
- `"physics"` - Physical systems (Lotka-Volterra, Projectile, etc.)
- `"finance"` - Financial models (coming soon)
- `"custom"` - Custom equations

#### `model_type` (string)
Specific model to run. Options:
- `"SIR"` - Susceptible-Infected-Recovered epidemiology model
- `"LotkaVolterra"` - Predator-prey dynamics
- `"Logistic"` - Logistic growth
- `"Projectile"` - Projectile motion
- `"MonteCarlo"` - Monte Carlo simulation (coming soon)

#### `parameters` (object)
Model-specific parameters. Examples:

**SIR Model:**
```json
{
  "beta": 0.3,   // Infection rate
  "gamma": 0.1   // Recovery rate
}
```

**Lotka-Volterra:**
```json
{
  "alpha": 1.1,   // Prey birth rate
  "beta": 0.4,    // Predation rate
  "delta": 0.1,   // Predator death rate
  "gamma": 0.4    // Predator reproduction rate
}
```

#### `initial_conditions` (object)
Starting values for state variables.

**SIR Model:**
```json
{
  "S": 0.99,  // Susceptible (99% of population)
  "I": 0.01,  // Infected (1% of population)
  "R": 0      // Recovered (0%)
}
```

**Lotka-Volterra:**
```json
{
  "prey": 40,     // Initial prey population
  "predator": 9   // Initial predator population
}
```

#### `time_span` (object)
Time grid definition:
```json
{
  "start": 0,          // Start time
  "end": 160,          // End time
  "steps": 400,        // Number of data points (default: 400)
  "preview_mode": false // Fast preview with max 100 points (default: false)
}
```

### Optional Parameters

#### `method` (string, default: "RK45")
ODE solver method. Options:
- `"RK45"` - 4th/5th order Runge-Kutta (recommended, adaptive step size)
- `"RK23"` - 2nd/3rd order Runge-Kutta (faster, less accurate)
- `"DOP853"` - 8th order Dormand-Prince (very accurate, slower)

#### `return_data` (boolean, default: true)
Whether to return actual data points in response.
- `true` - Include `data` array in response (recommended for charts)
- `false` - Only return summary and metrics (faster for analysis-only)

#### `save_artifacts` (boolean, default: false)
Whether to save CSV/PNG files on server (usually not needed).
- `false` - No disk I/O, faster response, stateless (recommended)
- `true` - Save files to `/tmp/storage` (ephemeral, cleared on redeploy)

#### `sensitivity` (object, optional)
Run sensitivity analysis with parameter perturbations:
```json
{
  "beta": 0.05  // Test beta ± 5%
}
```

#### `tags` (array, optional)
Custom tags for your records:
```json
["user-123", "experiment-A", "baseline"]
```

---

## 🎨 Response Data Structure

### Success Response Fields

#### `status` (string)
Always `"success"` for successful simulations.

#### `message` (string)
Human-readable status message. Example: `"Simulation completed"`

#### `summary` (string)
Brief summary of key results. Example: `"Peak values: S=0.99, I=0.43, R=0.58"`

#### `metrics` (object)
Computed metrics from simulation:
```json
{
  "peak_I": 0.4278,           // Maximum infected value
  "time_at_peak_I": 38.5,     // Time when peak occurs
  "final_S": 0.0012,          // Final susceptible value
  "final_R": 0.9988           // Final recovered value
}
```

#### `columns` (array)
Column names for data array. Example: `["t", "S", "I", "R"]`

#### `data` (array, if `return_data: true`)
Time series data points. Each point is an object:
```json
[
  {"t": 0, "S": 0.99, "I": 0.01, "R": 0},
  {"t": 0.4, "S": 0.9888, "I": 0.0112, "R": 0.0000},
  {"t": 0.8, "S": 0.9876, "I": 0.0124, "R": 0.0000},
  ...
]
```

**For charting libraries like Recharts/Chart.js:** Use this array directly!

#### `artifacts` (array)
File artifacts (empty if `save_artifacts: false`):
```json
[]
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error message here"
      }
    ],
    "isError": true
  }
}
```

---

## 💾 Data Persistence Strategy

### What to Store in Supabase

Since the server is stateless, your app should persist:

#### 1. Simulation Inputs (for replay/sharing)
```sql
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  chat_id UUID REFERENCES chats(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Simulation parameters
  domain TEXT NOT NULL,
  model_type TEXT NOT NULL,
  parameters JSONB NOT NULL,
  initial_conditions JSONB NOT NULL,
  time_span JSONB NOT NULL,
  method TEXT DEFAULT 'RK45',
  
  -- Tags and metadata
  tags TEXT[],
  description TEXT
);
```

#### 2. Simulation Results (for caching/history)
```sql
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID REFERENCES simulations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Result data
  status TEXT NOT NULL,
  message TEXT,
  summary TEXT,
  metrics JSONB,
  columns TEXT[],
  data JSONB,  -- Store the time series data
  
  -- Indexes for fast queries
  INDEX idx_simulation_id (simulation_id),
  INDEX idx_created_at (created_at DESC)
);
```

#### 3. Optional: Store charts as images in Supabase Storage
If you render charts on the frontend, you can optionally save them:
```typescript
// After rendering chart with Recharts/Canvas
const chartBlob = await chartToBlob(chartCanvas);

const { data, error } = await supabase.storage
  .from('simulation-charts')
  .upload(`${userId}/${simulationId}.png`, chartBlob);
```

---

## 🔍 Troubleshooting

### Issue: Getting `undefined` in response

**Likely causes:**

1. **Not parsing SSE format correctly**
   ```typescript
   // ❌ Wrong - trying to parse entire response as JSON
   const result = await response.json();
   
   // ✅ Correct - parse SSE format first
   const text = await response.text();
   const lines = text.split('\n');
   const dataLine = lines.find(line => line.startsWith('data: '));
   const jsonData = JSON.parse(dataLine.substring(6));
   ```

2. **Not accessing `_meta.result`**
   ```typescript
   // ❌ Wrong - accessing result directly
   const data = jsonData.result.data;
   
   // ✅ Correct - access via _meta
   const data = jsonData.result._meta.result.data;
   
   // ✅ Or parse text content
   const result = JSON.parse(jsonData.result.content[0].text);
   const data = result.data;
   ```

3. **Missing `Accept` header**
   ```typescript
   // ❌ Wrong - missing header
   headers: {
     'Content-Type': 'application/json'
   }
   
   // ✅ Correct - include both content types
   headers: {
     'Content-Type': 'application/json',
     'Accept': 'application/json, text/event-stream'
   }
   ```

4. **Not wrapping arguments in `spec`**
   ```json
   // ❌ Wrong
   {
     "params": {
       "name": "simulate_model",
       "arguments": {
         "domain": "epidemiology",
         ...
       }
     }
   }
   
   // ✅ Correct
   {
     "params": {
       "name": "simulate_model",
       "arguments": {
         "spec": {
           "domain": "epidemiology",
           ...
         }
       }
     }
   }
   ```

### Issue: "Field required" validation error

Check that all required fields are present:
- `domain`
- `model_type`
- `parameters` (object with model-specific keys)
- `initial_conditions` (object with state variables)
- `time_span` (with `start` and `end`)

### Issue: "JSON schema validation failed"

Ensure:
- `parameters` and `initial_conditions` are objects (not arrays)
- `time_span.start` and `time_span.end` are numbers
- `time_span.steps` is an integer ≥ 2
- Optional fields (`sensitivity`, `tags`) are either provided correctly or omitted (null is OK)

### Issue: Response is too slow

Use performance optimizations:
```json
{
  "time_span": {
    "start": 0,
    "end": 160,
    "steps": 100,        // Fewer points
    "preview_mode": true  // Caps at 100 points
  },
  "return_data": true,
  "save_artifacts": false  // Faster, no disk I/O
}
```

---

## 📝 Complete Example: SIR Model in React/TypeScript

```typescript
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface SimulationData {
  t: number;
  S: number;
  I: number;
  R: number;
}

export function SIRSimulation() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimulationData[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  async function runSimulation() {
    setLoading(true);
    
    try {
      // 1. Call MCP server
      const response = await fetch('https://simulator-mcp-server.onrender.com/mcp', {
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
                  steps: 400,
                  preview_mode: false
                },
                method: 'RK45',
                return_data: true,
                save_artifacts: false
              }
            }
          }
        })
      });

      // 2. Parse SSE response
      const text = await response.text();
      const lines = text.split('\n');
      const dataLine = lines.find(line => line.startsWith('data: '));
      
      if (!dataLine) {
        throw new Error('No data in response');
      }
      
      const jsonData = JSON.parse(dataLine.substring(6));
      
      // 3. Check for errors
      if (jsonData.error) {
        throw new Error(jsonData.error.message);
      }
      
      // 4. Extract result
      const result = jsonData.result._meta?.result || 
                     JSON.parse(jsonData.result.content[0].text);
      
      if (result.status !== 'success') {
        throw new Error(result.message);
      }
      
      // 5. Update UI
      setData(result.data);
      setMetrics(result.metrics);
      
      // 6. Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('simulation_results').insert({
          user_id: user.id,
          domain: 'epidemiology',
          model_type: 'SIR',
          status: result.status,
          summary: result.summary,
          metrics: result.metrics,
          data: result.data
        });
      }
      
    } catch (error) {
      console.error('Simulation failed:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={runSimulation} disabled={loading}>
        {loading ? 'Running...' : 'Run SIR Simulation'}
      </button>
      
      {metrics && (
        <div>
          <h3>Results</h3>
          <p>Peak Infected: {(metrics.peak_I * 100).toFixed(2)}%</p>
          <p>Time at Peak: {metrics.time_at_peak_I.toFixed(1)} days</p>
        </div>
      )}
      
      {data.length > 0 && (
        <LineChart width={800} height={400} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" label={{ value: 'Time (days)', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Population', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="S" stroke="#8884d8" name="Susceptible" />
          <Line type="monotone" dataKey="I" stroke="#ff7300" name="Infected" />
          <Line type="monotone" dataKey="R" stroke="#82ca9d" name="Recovered" />
        </LineChart>
      )}
    </div>
  );
}
```

---

## 🚀 Quick Start Checklist

- [ ] Server URL: `https://simulator-mcp-server.onrender.com/mcp`
- [ ] Request method: `POST`
- [ ] Headers include: `Content-Type: application/json` and `Accept: application/json, text/event-stream`
- [ ] Request body uses JSON-RPC 2.0 format
- [ ] Arguments wrapped in `"spec"` key
- [ ] Parse response as SSE format (split by `\n`, find `data:` line)
- [ ] Extract result from `_meta.result` or parse `content[0].text`
- [ ] Handle errors by checking `jsonData.error` or `result.isError`
- [ ] Store inputs and results in Supabase for persistence
- [ ] Use `data` array directly in charting libraries

---

## 📞 Support

If you encounter issues:

1. **Check server health:** `https://simulator-mcp-server.onrender.com/health`
2. **Test with curl:** See `/test_mcp.sh` script for working examples
3. **Check Render logs:** [Render Dashboard](https://dashboard.render.com) → simulation-mcp-server → Logs
4. **Verify request format:** Use the examples in this guide exactly

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Stateless architecture design
- [FEATURES_SUMMARY.md](./FEATURES_SUMMARY.md) - All available features
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Server deployment guide

