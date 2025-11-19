# Connecting Your AI App to the MCP Server

This guide explains how to connect your AI application to the deployed simulation MCP server.

## Server Endpoints

Once deployed on Render, your server will have:

- **Base URL**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/health`
- **MCP Endpoint**: `https://your-app-name.onrender.com/mcp` (for streamable-http transport)

## Connection Methods

### Method 1: Using MCP Client SDK (Recommended)

If your AI app uses the official MCP client libraries:

#### TypeScript/JavaScript
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamable-http.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://your-app-name.onrender.com/mcp")
);

const client = new Client({
  name: "my-ai-app",
  version: "1.0.0",
}, {
  capabilities: {}
});

await client.connect(transport);

// Call the simulate_model tool
const result = await client.callTool({
  name: "simulate_model",
  arguments: {
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
      steps: 600
    },
    method: "RK45",
    tags: ["demo"]
  }
});

console.log(result);
```

#### Python
```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.http import http_client

# For HTTP transport
async with http_client("https://your-app-name.onrender.com/mcp") as (read, write):
    async with ClientSession(read, write) as session:
        # Initialize the connection
        await session.initialize()
        
        # Call the simulate_model tool
        result = await session.call_tool(
            "simulate_model",
            arguments={
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
                    "steps": 600
                },
                "method": "RK45",
                "tags": ["demo"]
            }
        )
        
        print(result)
```

### Method 2: Direct HTTP Requests

If you're not using the MCP SDK, you can make direct HTTP requests:

#### Using curl
```bash
curl -X POST https://your-app-name.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "simulate_model",
      "arguments": {
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
          "steps": 600
        },
        "method": "RK45",
        "tags": ["demo"]
      }
    }
  }'
```

#### Using JavaScript fetch
```javascript
const response = await fetch('https://your-app-name.onrender.com/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'simulate_model',
      arguments: {
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
          steps: 600
        },
        method: 'RK45',
        tags: ['demo']
      }
    }
  })
});

const result = await response.json();
console.log(result);
```

## Response Format

The server returns a JSON response with this structure:

```json
{
  "status": "success",
  "message": "Simulation completed",
  "summary": "Peak infection 0.3743 at t ≈ 33.89",
  "artifacts": [
    {
      "kind": "csv",
      "path": "/data/storage/sir_20251112T143025_a1b2c3d4.csv",
      "sha256": null
    },
    {
      "kind": "plot",
      "path": "/data/storage/sir_20251112T143025_a1b2c3d4.png",
      "sha256": null
    }
  ],
  "metrics": {
    "I_peak": 0.3743,
    "t_peak": 33.89
  },
  "columns": ["t", "S", "I", "R"]
}
```

## Available Models

Currently supported:

### Epidemiology
- **SIR Model**: Susceptible-Infected-Recovered epidemic model
  - Parameters: `beta` (infection rate), `gamma` (recovery rate)
  - Initial conditions: `S`, `I`, `R` (must sum to ≈1.0)
- **Lotka-Volterra Model**: Predator-prey dynamics
  - Parameters: `alpha` (prey growth rate), `beta` (predation rate), `delta` (predator growth rate), `gamma` (predator death rate)
  - Initial conditions: `x` (prey population), `y` (predator population)
- **Logistic Model**: Logistic population growth
  - Parameters: `r` (growth rate), `K` (carrying capacity)
  - Initial conditions: `P` (population)

### Physics
- **Projectile Model**: Projectile motion with gravity
  - Parameters: `g` (gravitational acceleration), `v0` (initial velocity), `angle` (launch angle in degrees)
  - Initial conditions: `x` (horizontal position), `y` (vertical position), `vx` (horizontal velocity), `vy` (vertical velocity)

### Finance
- **Monte Carlo Model**: Geometric Brownian motion for financial modeling
  - Parameters: `mu` (drift rate), `sigma` (volatility), `n_paths` (number of simulation paths), `seed` (optional random seed)
  - Initial conditions: `S` (initial asset price)

## Input Specification

### Required Fields
- `domain`: "epidemiology", "physics", "finance", or "custom"
- `model_type`: "SIR", "LotkaVolterra", "Logistic", etc.
- `parameters`: Model-specific parameters (dict of floats)
- `initial_conditions`: Initial state values (dict of floats)
- `time_span`: Object with `start`, `end`, and `steps`

### Optional Fields
- `method`: Solver method ("RK45", "RK23", "DOP853"), default: "RK45"
- `sensitivity`: Sensitivity analysis perturbations (dict)
- `tags`: Metadata tags (array of strings)

## Error Handling

### Common Errors

1. **Invalid model type**
```json
{
  "error": "No solver registered for domain=epidemiology, model_type=XYZ"
}
```

2. **Missing parameters**
```json
{
  "error": "JSON schema validation failed: 'parameters' is a required property"
}
```

3. **Solver error**
```json
{
  "error": "Solver error: Initial conditions must sum to approximately 1.0"
}
```

## Health Check

Verify the server is running:

```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "simulation-mcp",
  "version": "0.1.0",
  "storage": "/data/storage",
  "solvers": 1
}
```

## Rate Limits & Performance

### Render Free Tier
- Server may spin down after 15 minutes of inactivity
- First request after spin-down: ~30-60s cold start
- Subsequent requests: <1s response time

### Render Paid Tiers
- No spin-down
- Faster CPU/RAM
- Better for production use

### Simulation Performance
- Simple SIR model (600 steps): ~1-2 seconds
- Complex models (10,000+ steps): ~5-30 seconds
- Consider queuing for very long simulations

## Troubleshooting

### Connection Timeout
- Render free tier spins down - first request is slow
- Wait 60s and retry
- Consider upgrading to paid tier for always-on service

### Server Error (500)
- Check Render logs in dashboard
- Verify input format matches schema
- Ensure all required fields are provided

### Artifacts Not Accessible
- Artifacts stored on Render disk (not publicly accessible by URL)
- Response includes file paths but files are server-side only
- Consider implementing artifact download endpoint if needed

## Example Integration: AI Agent

```typescript
// Example: Anthropic Claude with MCP
import Anthropic from "@anthropic-ai/sdk";
import { MCPClient } from "@modelcontextprotocol/sdk/client/index.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Connect to MCP server
const mcpClient = new MCPClient({
  serverUrl: "https://your-app-name.onrender.com/mcp"
});

await mcpClient.connect();

// Use Claude with MCP tools
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  tools: await mcpClient.listTools(),
  messages: [
    {
      role: "user",
      content: "Run a SIR epidemic simulation with beta=0.3 and gamma=0.1"
    }
  ]
});

console.log(message);
```

## Security Considerations

1. **No Authentication**: Currently the server has no authentication
   - Add API key validation if needed
   - Use Render's environment variables for secrets

2. **Rate Limiting**: Not implemented
   - Consider adding nginx reverse proxy with rate limiting
   - Or implement in application code

3. **Input Validation**: Robust validation in place
   - Pydantic models validate types
   - JSON schema validates structure
   - Solver validates numerical constraints

## Support & Documentation

- [MCP Protocol Docs](https://modelcontextprotocol.io)
- [FastMCP Docs](https://github.com/jlowin/fastmcp)
- [Render Docs](https://render.com/docs)

## Need Help?

Check the logs:
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for error messages

Common issues are documented in DEPLOYMENT.md troubleshooting section.


