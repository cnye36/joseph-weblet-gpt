/**
 * MCP Server Diagnostic Script
 * 
 * Run this script to test MCP server connectivity and tool availability:
 * npx tsx scripts/test-mcp-servers.ts
 * 
 * Tests using the SAME approach as the app:
 * - ArXiv: Direct HTTP (session issues with SDK)
 * - Simulation: SDK (works perfectly)
 */

import { experimental_createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
async function testArxivMCP() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 Testing ArXiv MCP Server (Direct HTTP)");
  console.log("=".repeat(80));

  try {
    const arxivUrl =
      process.env.ARXIV_MCP_URL ||
      "https://arxiv-mcp-server-6akh.onrender.com/mcp";
    const url = new URL(arxivUrl);
    console.log(`📡 Connecting to: ${url.href}`);
    console.log(`   Method: AI SDK Streamable HTTP transport`);
    
    const client = await experimental_createMCPClient({
      transport: new StreamableHTTPClientTransport(url),
    });

    const tools = await client.tools();
    const toolNames = Object.keys(tools);
    if (!toolNames.length) {
      throw new Error("No tools returned by ArXiv MCP");
    }
    
    console.log(`\n📚 Available Tools: ${toolNames.length}`);
    for (const toolName of toolNames) {
      const tool = tools[toolName];
      console.log(`   - ${toolName}`);
      if (tool && typeof tool === "object" && "description" in tool) {
        const firstLine = (tool as { description?: string }).description
          ?.split("\n")[0];
        if (firstLine) {
          console.log(
            `     ${firstLine.slice(0, 80)}${
              firstLine.length > 80 ? "..." : ""
            }`
          );
        }
      }
    }

    await client.close();
    console.log("\n✅ ArXiv MCP Server Test Passed");
    console.log("   Note: Using AI SDK Streamable HTTP transport");
    return true;
  } catch (error) {
    console.error("\n❌ ArXiv MCP Server Test Failed");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("\n💡 Hints:");
      console.error("   - Server might be down or unreachable");
      console.error("   - Check if the URL is correct");
      console.error("   - Verify the server is returning proper JSON-RPC responses");
    }
    return false;
  }
}

async function testSimulationMCP() {
  console.log("\n" + "=".repeat(80));
  console.log("🔬 Testing Simulation MCP Server (AI SDK)");
  console.log("=".repeat(80));

  try {
    const simulationUrl = new URL("https://simulator-mcp-server.onrender.com/mcp");
    console.log(`📡 Connecting to: ${simulationUrl.href}`);
    console.log(`   Method: AI SDK with StreamableHTTPClientTransport`);
    
    // Test health endpoint (optional)
    console.log("\n🔄 Testing server health...");
    try {
      const baseUrl = simulationUrl.origin;
      const healthResponse = await fetch(`${baseUrl}/health`, {
        method: "GET",
      });
      console.log(`   Health check: ✅ ${healthResponse.status}`);
    } catch {
      console.log(`   Health check: ⚠️  No /health endpoint (OK)`);
    }

    // Create MCP client using SDK
    console.log("\n🔄 Creating MCP client via SDK...");
    const client = await experimental_createMCPClient({
      transport: new StreamableHTTPClientTransport(simulationUrl),
    });

    console.log("   ✅ Connection successful!");

    const tools = await client.tools();
    console.log(`\n🧪 Available Tools: ${Object.keys(tools).length}`);
    Object.keys(tools).forEach((toolName) => {
      console.log(`   - ${toolName}`);
      const tool = tools[toolName];
      if (tool && typeof tool === "object" && "description" in tool) {
        const desc = (tool as { description?: string }).description || '';
        const firstLine = desc.split('\n')[0];
        console.log(`     ${firstLine.slice(0, 80)}${firstLine.length > 80 ? '...' : ''}`);
      }
    });

    await client.close();
    console.log("\n✅ Simulation MCP Server Test Passed");
    return true;
  } catch (error) {
    console.error("\n❌ Simulation MCP Server Test Failed");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("\n💡 Hints:");
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ECONNRESET")) {
        console.error("   - Server might be down");
        console.error("   - Check Render.com dashboard for server status");
      }
      if (error.message.includes("Session not found")) {
        console.error("   - Server might not support StreamableHTTP properly");
        console.error("   - Check server logs on Render.com");
      }
    }
    return false;
  }
}

async function main() {
  console.log("\n🚀 MCP Server Diagnostic Test");
  console.log("Testing with AI SDK transports (matches app implementation):");
  console.log("  • ArXiv: HTTP transport via /mcp endpoint");
  console.log("  • Simulation: AI SDK Streamable transport");
  console.log("=" + "=".repeat(80));

  const arxivResult = await testArxivMCP();
  const simulationResult = await testSimulationMCP();

  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY");
  console.log("=".repeat(80));
  console.log(`ArXiv MCP:      ${arxivResult ? "✅ PASS (HTTP transport)" : "❌ FAIL"}`);
  console.log(`Simulation MCP: ${simulationResult ? "✅ PASS (AI SDK)" : "❌ FAIL"}`);
  console.log("=".repeat(80));
  
  if (arxivResult && simulationResult) {
    console.log("\n🎉 All tests passed! Your app is ready to use both MCP servers.");
    console.log("\nNext steps:");
    console.log("  1. Add environment variables to .env.local");
    console.log("  2. Run: pnpm dev");
    console.log("  3. Enable MCP toggles in the UI");
    console.log("  4. Ask for simulations or ArXiv searches!");
  } else {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
  }
  console.log("");

  if (!arxivResult || !simulationResult) {
    process.exit(1);
  }
}

main().catch(console.error);

