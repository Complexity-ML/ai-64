/**
 * AI-64 :: Tool — Edit File (search & replace)
 */

import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";

export class EditFileTool implements Tool {
  name = "edit_file";
  description = "Edit a file by replacing text (search & replace)";
  args = "ARG: path=<path> ARG: old=<text_to_find> ARG: new=<replacement_text>";
  private root: string;

  constructor(projectRoot: string) {
    this.root = projectRoot;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const filePath = args.path;
    const oldText = args.old;
    const newText = args.new ?? "";

    if (!filePath) return "ERROR: Missing 'path' argument.";
    if (oldText === undefined) return "ERROR: Missing 'old' argument.";

    const full = path.resolve(this.root, filePath);
    if (!full.startsWith(path.resolve(this.root))) {
      return "ERROR: Path outside project root.";
    }
    if (!fs.existsSync(full)) return `ERROR: File not found: ${filePath}`;

    let content = fs.readFileSync(full, "utf-8");

    if (!content.includes(oldText)) {
      return `ERROR: Text not found in ${filePath}. Read the file first to see exact content.`;
    }

    // Count occurrences
    const count = content.split(oldText).length - 1;
    content = content.replace(oldText, newText);
    fs.writeFileSync(full, content, "utf-8");

    return `OK: Replaced ${count > 1 ? "first of " + count + " occurrences" : "1 occurrence"} in ${filePath}`;
  }
}
