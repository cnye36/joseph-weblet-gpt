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
        // Escape quotes and wrap in quotes to handle special characters
        const label = labelText.replace(/"/g, "'");
        
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
        
        mermaid += `    ${id}${shapeStart}"${label}"${shapeEnd}\n`;
      });
    }
    
    if (config.edges) {
      config.edges.forEach(edge => {
        const from = sanitizeId(edge.from);
        const to = sanitizeId(edge.to);
        const label = edge.label ? `|"${edge.label}"|` : "";
        mermaid += `    ${from} -->${label} ${to}\n`;
      });
    }
    
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
