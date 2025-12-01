import { ChartToolConfig } from "./chart-schemas";

const sanitizeId = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

export function generateMermaidString(config: ChartToolConfig): string {
  if (config.type === "flowchart") {
    const direction = config.direction || "TD";
    let mermaid = `flowchart ${direction}\n`;
    
    if (config.nodes) {
      config.nodes.forEach(node => {
        const id = sanitizeId(node.id);
        const labelText = node.label || node.id;
        
        // For Mermaid, we need to:
        // 1. Keep the label text readable
        // 2. Escape quotes properly
        // 3. Use quotes to wrap the label for multi-word support
        // Strategy: Replace double quotes with single quotes, keep everything else
        const cleanLabel = labelText.replace(/"/g, "'");
        
        let shapeStart = "[";
        let shapeEnd = "]";
        
        switch (node.shape) {
          case "circle": shapeStart = "(("; shapeEnd = "))"; break;
          case "diamond": shapeStart = "{"; shapeEnd = "}"; break;
          case "stadium": shapeStart = "(["; shapeEnd = "])"; break;
          case "cylinder": shapeStart = "[("; shapeEnd = ")]"; break;
          case "subroutine": shapeStart = "[["; shapeEnd = "]]"; break;
          case "rect": shapeStart = "["; shapeEnd = "]"; break;
          default: break;
        }
        
        // Use quotes around label to support spaces and special characters
        mermaid += `    ${id}${shapeStart}"${cleanLabel}"${shapeEnd}\n`;
      });
    }
    
    if (config.edges) {
      config.edges.forEach(edge => {
        const from = sanitizeId(edge.from);
        const to = sanitizeId(edge.to);
        if (edge.label) {
          const cleanLabel = edge.label.replace(/"/g, "'");
          mermaid += `    ${from} -->|"${cleanLabel}"| ${to}\n`;
        } else {
          mermaid += `    ${from} --> ${to}\n`;
        }
      });
    }
    
    console.log("=== GENERATED MERMAID STRING ===");
    console.log(mermaid);
    console.log("=================================");
    
    return mermaid;
  }
  
  if (config.type === "gantt") {
    let mermaid = `gantt\n    title ${config.title}\n    dateFormat YYYY-MM-DD\n    axisFormat %Y-%m-%d\n`;
    
    if (config.tasks) {
      // Group by section if we had sections, but for flat schema we'll just put them in one section or infer?
      // Let's just put them in a "Tasks" section for now
      mermaid += `    section Tasks\n`;
      
      config.tasks.forEach(task => {
        const id = sanitizeId(task.id);
        const label = task.label.replace(/:/g, "-"); // Colons break mermaid gantt
        let timing = "";
        
        if (task.dependsOn && task.dependsOn.length > 0) {
          const after = sanitizeId(task.dependsOn[0]);
          timing = `after ${after}`;
          if (task.duration) timing += `, ${task.duration}`;
        } else if (task.start) {
          timing = `${task.start}`;
          if (task.end) timing += `, ${task.end}`;
          else if (task.duration) timing += `, ${task.duration}`;
          else timing += `, 1d`; // Default
        } else {
          // No start, no dependency?
          timing = `${new Date().toISOString().split('T')[0]}, 1d`;
        }
        
        mermaid += `    ${label} :${id}, ${timing}\n`;
      });
    }
    
    return mermaid;
  }
  
  return "";
}
