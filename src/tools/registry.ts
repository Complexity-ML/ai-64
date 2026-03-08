/**
 * AI-64 :: Tool Registry
 */

import type { Tool } from "../types.js";
import { ReadFileTool } from "./readFile.js";
import { WriteFileTool } from "./writeFile.js";
import { EditFileTool } from "./editFile.js";
import { ListFilesTool } from "./listFiles.js";
import { SearchCodeTool } from "./searchCode.js";
import { ExecuteTool } from "./execute.js";
import { ShellTool } from "./shell.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, args: Record<string, string>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      const available = [...this.tools.keys()].join(", ");
      return `ERROR: Unknown tool '${name}'. Available: ${available}`;
    }
    try {
      return await tool.execute(args);
    } catch (err: any) {
      return `ERROR: ${err.message}`;
    }
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }
}

export function createDefaultRegistry(
  projectRoot: string,
  apiUrl: string,
  sessionId: string,
  execTimeout = 30_000,
): ToolRegistry {
  const reg = new ToolRegistry();
  reg.register(new ReadFileTool(projectRoot));
  reg.register(new WriteFileTool(projectRoot));
  reg.register(new EditFileTool(projectRoot));
  reg.register(new ListFilesTool(projectRoot));
  reg.register(new SearchCodeTool(projectRoot));
  reg.register(new ExecuteTool(apiUrl, sessionId, execTimeout));
  reg.register(new ShellTool(apiUrl, sessionId, execTimeout));
  return reg;
}
