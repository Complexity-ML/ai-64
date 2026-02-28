/**
 * AI-64 :: Tool — Execute Python
 */

import { execSync } from "node:child_process";
import type { Tool } from "../types.js";

export class ExecuteTool implements Tool {
  name = "execute_python";
  description = "Run Python code in a subprocess";
  args = "ARG: code=<python_code>";
  private root: string;
  private timeout: number;

  constructor(projectRoot: string, timeout = 30_000) {
    this.root = projectRoot;
    this.timeout = timeout;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const code = args.code;
    if (!code) return "ERROR: Missing 'code' argument.";

    try {
      const output = execSync(`python -c ${JSON.stringify(code)}`, {
        cwd: this.root,
        timeout: this.timeout,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
      });

      const result = output.trim();
      if (result.length > 2000) return result.slice(0, 2000) + "\n... (truncated)";
      return result || "(no output)";
    } catch (err: any) {
      if (err.killed) return `ERROR: Timed out after ${this.timeout / 1000}s.`;
      const stderr = err.stderr?.trim() || err.message;
      const stdout = err.stdout?.trim() || "";
      let out = stdout;
      if (stderr) out += (out ? "\n" : "") + `STDERR:\n${stderr}`;
      if (out.length > 2000) return out.slice(0, 2000) + "\n... (truncated)";
      return out || `ERROR: Process exited with code ${err.status}`;
    }
  }
}
