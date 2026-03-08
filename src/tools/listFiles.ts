/**
 * AI-64 :: Tool — List Files (glob)
 */

import { globSync } from "glob";
import path from "node:path";
import fs from "node:fs";
import type { Tool } from "../types.js";

export class ListFilesTool implements Tool {
  name = "list_files";
  description = "List files matching a glob pattern";
  parameters = {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern (e.g. '**/*.py', 'src/*.ts')" },
    },
    required: ["pattern"],
  };
  private root: string;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const pattern = args.pattern || "*";

    const matches = globSync(pattern, {
      cwd: this.root,
      nodir: false,
      ignore: ["node_modules/**", ".git/**", "__pycache__/**", "dist/**"],
    }).sort();

    if (matches.length === 0) return "No files matched.";

    const results = matches.slice(0, 100).map((m) => {
      const full = path.join(this.root, m);
      try {
        return fs.statSync(full).isDirectory() ? m + "/" : m;
      } catch {
        return m;
      }
    });

    if (matches.length > 100) {
      results.push(`... (${matches.length} total)`);
    }

    return results.join("\n");
  }
}
