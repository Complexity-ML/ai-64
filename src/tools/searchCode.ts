/**
 * AI-64 :: Tool — Search Code (grep)
 */

import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";

const SKIP_DIRS = new Set([
  ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", ".next",
]);
const SKIP_EXTS = new Set([
  ".pyc", ".pyo", ".so", ".dll", ".exe", ".png", ".jpg",
  ".gif", ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf",
]);

export class SearchCodeTool implements Tool {
  name = "search_code";
  description = "Search for a regex pattern in project files";
  parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Regex pattern to search for" },
      path: { type: "string", description: "Optional subdirectory to search in" },
    },
    required: ["query"],
  };
  private root: string;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const query = args.query;
    if (!query) return "ERROR: Missing 'query' argument.";

    let searchRoot = this.root;
    if (args.path) {
      searchRoot = path.resolve(this.root, args.path);
      if (!searchRoot.startsWith(path.resolve(this.root))) {
        return "ERROR: Path outside project root.";
      }
    }

    let regex: RegExp;
    try {
      regex = new RegExp(query, "i");
    } catch (e: any) {
      return `ERROR: Invalid regex: ${e.message}`;
    }

    const results: string[] = [];
    this.walkDir(searchRoot, regex, results);

    if (results.length === 0) return `No matches for '${query}'.`;
    return results.join("\n");
  }

  private walkDir(dir: string, regex: RegExp, results: string[]) {
    if (results.length >= 50) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= 50) {
        results.push("... (max 50 matches)");
        return;
      }

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          this.walkDir(full, regex, results);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SKIP_EXTS.has(ext)) continue;

        try {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const rel = path.relative(this.root, full);
              results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
              if (results.length >= 50) return;
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }
}
