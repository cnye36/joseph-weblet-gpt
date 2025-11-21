import { tool } from "ai";
import { z } from "zod";

// Helper to parse ArXiv XML response (simple regex/string manipulation to avoid heavy deps)
// For a production app, use a proper XML parser like fast-xml-parser
function parseArxivEntry(entry: string) {
  const getValue = (tag: string) => {
    const match = entry.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
    return match ? match[1].trim() : "";
  };

  const id = getValue("id").replace("http://arxiv.org/abs/", "");
  const title = getValue("title").replace(/\s+/g, " ").trim();
  const summary = getValue("summary").replace(/\s+/g, " ").trim();
  const published = getValue("published");
  const updated = getValue("updated");
  
  // Authors
  const authors: string[] = [];
  const authorMatches = entry.matchAll(/<author>\s*<name>(.*?)<\/name>\s*<\/author>/g);
  for (const match of authorMatches) {
    authors.push(match[1]);
  }

  // Links
  const links: string[] = [];
  const linkMatches = entry.matchAll(/<link[^>]*href="(.*?)"[^>]*\/>/g);
  for (const match of linkMatches) {
    links.push(match[1]);
  }
  const pdfLink = links.find(l => l.includes("pdf")) || "";

  return {
    id,
    title,
    summary,
    authors,
    published,
    updated,
    pdfLink,
    url: `https://arxiv.org/abs/${id}`
  };
}

async function searchArxiv(query: string, maxResults = 5) {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
  const response = await fetch(url);
  const text = await response.text();
  
  const entries = text.split("<entry>");
  // Remove the first part (header)
  entries.shift();
  
  return entries.map(parseArxivEntry);
}

async function getArxivPaper(id: string) {
  const url = `http://export.arxiv.org/api/query?id_list=${id}`;
  const response = await fetch(url);
  const text = await response.text();
  
  const entries = text.split("<entry>");
  if (entries.length < 2) return null;
  
  return parseArxivEntry(entries[1]);
}

export const arxivTools = {
  arxiv_search_papers: tool({
    description: "Search for research papers on ArXiv. Returns a list of papers with titles, summaries, authors, and links.",
    parameters: z.object({
      query: z.string().describe("Search query (e.g., 'machine learning', 'quantum computing')"),
      max_results: z.number().optional().describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, max_results = 5 }) => {
      try {
        console.log(`📚 Searching ArXiv for: "${query}"`);
        const results = await searchArxiv(query, max_results);
        return {
          results: results.map(r => ({
            id: r.id,
            title: r.title,
            authors: r.authors.slice(0, 3).join(", ") + (r.authors.length > 3 ? " et al." : ""),
            published: r.published.split("T")[0],
            summary: r.summary.slice(0, 200) + "...",
            link: r.url
          }))
        };
      } catch (error) {
        console.error("Error searching ArXiv:", error);
        return { error: "Failed to search ArXiv" };
      }
    },
  }),

  arxiv_get_paper_details: tool({
    description: "Get detailed information about a specific ArXiv paper by ID.",
    parameters: z.object({
      id: z.string().describe("ArXiv paper ID (e.g., '2310.12345')"),
    }),
    execute: async ({ id }) => {
      try {
        console.log(`📚 Getting ArXiv paper details for: ${id}`);
        const paper = await getArxivPaper(id);
        if (!paper) return { error: "Paper not found" };
        return { paper };
      } catch (error) {
        console.error("Error getting ArXiv paper:", error);
        return { error: "Failed to get paper details" };
      }
    },
  }),
};
