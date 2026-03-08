/**
 * AI-64 :: System Prompt
 */

import type { Tool, ChatMessage } from "../types.js";

export function buildSystemPrompt(tools: Tool[], projectRoot: string): string {
  const toolDocs = tools
    .map((t) => `- ${t.name}: ${t.description}. ${t.args}`)
    .join("\n");

  return `You are AI-64, a coding agent. You can execute code in Python, Node.js, and Bash via a remote sandbox.
Tools: ${tools.map((t) => t.name).join(", ")}
Use: TOOL: <name> then ARG: <key>=<value>
Or reply with plain text when done.`;
}

export function systemMessage(tools: Tool[], projectRoot: string): ChatMessage {
  return {
    role: "system",
    content: buildSystemPrompt(tools, projectRoot),
  };
}

export function toolResultMessage(
  toolName: string,
  result: string
): ChatMessage {
  return {
    role: "user",
    content: `[TOOL RESULT: ${toolName}]\n${result}\n[/TOOL RESULT]`,
  };
}
