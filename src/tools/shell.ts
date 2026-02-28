/**
 * AI-64 :: Tool — Shell Command
 */

import { execSync } from "node:child_process";
import type { Tool } from "../types.js";

export class ShellTool implements Tool {
  name = "shell";
  description = "Run a shell command (ls, cat, git, npm, etc.)";
  args = "ARG: command=<shell_command>";
  private root: string;
  private timeout: number;

  constructor(projectRoot: string, timeout = 30_000) {
    this.root = projectRoot;
    this.timeout = timeout;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const command = args.command;
    if (!command) return "ERROR: Missing 'command' argument.";

    try {
      const output = execSync(command, {
        cwd: this.root,
        timeout: this.timeout,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
      } as any);

      const result = output.trim();
      if (result.length > 3000) return result.slice(0, 3000) + "\n... (truncated)";
      return result || "(no output)";
    } catch (err: any) {
      if (err.killed) return `ERROR: Timed out after ${this.timeout / 1000}s.`;
      const stderr = err.stderr?.trim() || err.message;
      const stdout = err.stdout?.trim() || "";
      let out = stdout;
      if (stderr) out += (out ? "\n" : "") + `STDERR:\n${stderr}`;
      if (out.length > 3000) return out.slice(0, 3000) + "\n... (truncated)";
      return out || `ERROR: exit code ${err.status}`;
    }
  }
}
