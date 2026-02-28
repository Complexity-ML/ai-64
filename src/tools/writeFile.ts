/**
 * AI-64 :: Tool — Write File
 */

import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";

export class WriteFileTool implements Tool {
  name = "write_file";
  description = "Create or overwrite a file";
  args = "ARG: path=<path> ARG: content=<content>";
  private root: string;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const filePath = args.path;
    const content = args.content ?? "";

    if (!filePath) return "ERROR: Missing 'path' argument.";

    const full = path.resolve(this.root, filePath);
    if (!full.startsWith(path.resolve(this.root))) {
      return "ERROR: Path outside project root.";
    }

    // Create parent dirs
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");

    const lineCount = content.split("\n").length;
    return `OK: Wrote ${lineCount} lines to ${filePath}`;
  }
}
