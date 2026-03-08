/**
 * AI-64 :: Context Manager — conversation history with truncation
 */

import type { ChatMessage, ToolCall } from "../types.js";
import { systemMessage, toolResultMessage } from "../llm/prompt.js";

export class ContextManager {
  private messages: ChatMessage[] = [];
  private maxTokens: number;

  constructor(projectRoot: string, maxTokens = 16000) {
    this.maxTokens = maxTokens;
    this.messages = [systemMessage(projectRoot)];
  }

  addUser(content: string) {
    this.messages.push({ role: "user", content });
    this.truncate();
  }

  addAssistant(content: string | null, toolCalls?: ToolCall[]) {
    const msg: ChatMessage = { role: "assistant", content };
    if (toolCalls?.length) msg.tool_calls = toolCalls;
    this.messages.push(msg);
    this.truncate();
  }

  addToolResult(toolCallId: string, result: string) {
    const maxResult = 3000;
    const truncated =
      result.length > maxResult
        ? result.slice(0, maxResult) + "\n... (truncated)"
        : result;
    this.messages.push(toolResultMessage(toolCallId, truncated));
    this.truncate();
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  reset() {
    const sys = this.messages[0];
    this.messages = [sys];
  }

  private estimateTokens(): number {
    let chars = 0;
    for (const m of this.messages) {
      if (m.content) chars += m.content.length;
      if (m.tool_calls) chars += JSON.stringify(m.tool_calls).length;
    }
    return Math.ceil(chars / 4);
  }

  private truncate() {
    // Keep: system (0), original user task (1), last 6 messages
    while (this.estimateTokens() > this.maxTokens && this.messages.length > 8) {
      this.messages.splice(2, 1);
    }
  }
}
