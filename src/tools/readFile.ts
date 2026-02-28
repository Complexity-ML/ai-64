/**
 * AI-64 :: Tool — Read File
 */

import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";

export class ReadFileTool implements Tool {
  name = "read_file";
  description = "Read a file from the project";
  args = "ARG: path=<relative_path>";
  private root: string;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const filePath = args.path;
    if (!filePath) return "ERROR: Missing 'path' argument.";

    const full = path.resolve(this.root, filePath);
    if (!full.startsWith(path.resolve(this.root))) {
      return "ERROR: Path outside project root.";
    }

    if (!fs.existsSync(full)) return `ERROR: File not found: ${filePath}`;
    if (!fs.statSync(full).isFile()) return `ERROR: Not a file: ${filePath}`;

    const content = fs.readFileSync(full, "utf-8");
    const lines = content.split("\n");

    // Add line numbers
    const numbered = lines
      .slice(0, 300)
      .map((line, i) => `${String(i + 1).padStart(4)} | ${line}`)
      .join("\n");

    if (lines.length > 300) {
      return numbered + `\n... (${lines.length} total lines, showing first 300)`;
    }
    return numbered;
  }
}
