/**
 * AI-64 :: Response Parser
 *
 * Parse THINK/TOOL/ARG format from model output.
 */

import type { ParsedResponse } from "../types.js";

export function parseResponse(raw: string): ParsedResponse {
  const result: ParsedResponse = {
    think: null,
    toolName: null,
    toolArgs: {},
    text: "",
  };

  const lines = raw.trim().split("\n");
  const textLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // THINK: line
    const thinkMatch = line.match(/^THINK:\s*(.+)/);
    if (thinkMatch) {
      result.think = thinkMatch[1].trim();
      i++;
      continue;
    }

    // TOOL: line
    const toolMatch = line.match(/^TOOL:\s*(.+)/);
    if (toolMatch) {
      result.toolName = toolMatch[1].trim();
      i++;

      // Consume ARG: lines
      while (i < lines.length) {
        const argMatch = lines[i].match(/^ARG:\s*(\w+)=(.*)/);
        if (argMatch) {
          const key = argMatch[1];
          let value = argMatch[2];

          // Multi-line content: continuation lines that don't start with THINK:/TOOL:/ARG:
          while (
            i + 1 < lines.length &&
            !lines[i + 1].match(/^(THINK|TOOL|ARG):/)
          ) {
            i++;
            value += "\n" + lines[i];
          }

          result.toolArgs[key] = value;
          i++;
        } else {
          break;
        }
      }
      continue;
    }

    // Plain text
    textLines.push(line);
    i++;
  }

  result.text = textLines.join("\n").trim();
  return result;
}
