/**
 * AI-64 :: System Prompt & Tool Definitions
 */

import type { Tool, ChatMessage, ToolDefinition } from "../types.js";

export function buildSystemPrompt(projectRoot: string): string {
  return `You are AI-64, a coding agent. You help users with software engineering tasks.
You have access to tools for reading, writing, editing, and searching files in the project at: ${projectRoot}
You can execute code (Python, Node.js, Bash) in a remote sandbox with internet access.
Be concise. Use tools to explore before making changes. Read files before editing them.`;
}

export function systemMessage(projectRoot: string): ChatMessage {
  return {
    role: "system",
    content: buildSystemPrompt(projectRoot),
  };
}

export function buildToolDefinitions(tools: Tool[]): ToolDefinition[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function toolResultMessage(
  toolCallId: string,
  result: string,
): ChatMessage {
  return {
    role: "tool",
    content: result,
    tool_call_id: toolCallId,
  };
}
