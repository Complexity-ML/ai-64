/**
 * AI-64 :: System Prompt
 */

import type { Tool, ChatMessage } from "../types.js";

export function buildSystemPrompt(tools: Tool[], projectRoot: string): string {
  const toolDocs = tools
    .map((t) => `- ${t.name}: ${t.description}. ${t.args}`)
    .join("\n");

  return `You are AI-64, a coding agent. You help users by reading, writing, and executing code in their project.

Project root: ${projectRoot}

Available tools:
${toolDocs}

Format your responses like this:
THINK: <your reasoning about what to do>
TOOL: <tool_name>
ARG: <key>=<value>
ARG: <key>=<value>

Rules:
- Use one tool per response. Wait for the result before continuing.
- When you're done, respond with plain text (no TOOL).
- Always THINK before acting.
- Read files before editing them.
- Be precise with file paths (relative to project root).`;
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
