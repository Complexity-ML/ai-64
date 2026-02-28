/**
 * AI-64 :: Context Manager — conversation history with truncation
 */

import type { ChatMessage, Tool } from "../types.js";
import { systemMessage, toolResultMessage } from "../llm/prompt.js";

export class ContextManager {
  private messages: ChatMessage[] = [];
  private maxTokens: number;

  constructor(tools: Tool[], projectRoot: string, maxTokens = 2000) {
    this.maxTokens = maxTokens;
    this.messages = [systemMessage(tools, projectRoot)];
  }

  addUser(content: string) {
    this.messages.push({ role: "user", content });
    this.truncate();
  }

  addAssistant(content: string) {
    this.messages.push({ role: "assistant", content });
    this.truncate();
  }

  addToolResult(toolName: string, result: string) {
    // Truncate very long tool results before adding
    const maxResult = 1500;
    const truncated =
      result.length > maxResult
        ? result.slice(0, maxResult) + "\n... (truncated)"
        : result;
    this.messages.push(toolResultMessage(toolName, truncated));
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
    for (const m of this.messages) chars += m.content.length;
    return Math.ceil(chars / 4);
  }

  private truncate() {
    // Keep: system (0), original user task (1), last 4 messages
    while (this.estimateTokens() > this.maxTokens && this.messages.length > 6) {
      this.messages.splice(2, 1);
    }
  }
}
