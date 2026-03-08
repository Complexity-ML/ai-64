/**
 * AI-64 :: LLM Client — talks to vllm-i64 OpenAI-compatible API
 *
 * Supports native tool_calls and streaming.
 */

import type {
  ChatMessage,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ChatResponse,
  ToolCall,
  ToolDefinition,
} from "../types.js";

export class LLMClient {
  private apiUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private timeout: number;
  private sessionId: string;

  constructor(opts: {
    apiUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
    sessionId?: string;
  }) {
    this.apiUrl = opts.apiUrl.replace(/\/+$/, "");
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.temperature = opts.temperature;
    this.timeout = 300_000;
    this.sessionId = opts.sessionId || "ai-64";
  }

  /** Send messages with tools and get structured response (content + tool_calls). */
  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false,
      };
      if (tools?.length) body.tools = tools;

      const res = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      const choice = data.choices[0];
      return {
        content: choice.message.content,
        toolCalls: choice.message.tool_calls || [],
        finishReason: choice.finish_reason,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeout / 1000}s`);
      }
      if (err.cause?.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to ${this.apiUrl}. Is vllm-i64 running?`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Stream response with tool_calls support.
   * Calls onToken for each content token (for live display).
   * Returns full ChatResponse with accumulated content + tool_calls.
   */
  async chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[] | undefined,
    onToken: (token: string) => void,
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
      };
      if (tools?.length) body.tools = tools;

      const res = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }

      let fullContent = "";
      const toolCallsMap = new Map<number, {
        id: string;
        name: string;
        arguments: string;
      }>();
      let finishReason = "stop";

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const chunk = JSON.parse(payload) as ChatCompletionChunk;
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            if (chunk.choices[0].finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }

            // Content tokens
            if (delta.content) {
              fullContent += delta.content;
              onToken(delta.content);
            }

            // Tool call deltas
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCallsMap.has(idx)) {
                  toolCallsMap.set(idx, {
                    id: tc.id || "",
                    name: tc.function?.name || "",
                    arguments: "",
                  });
                }
                const entry = toolCallsMap.get(idx)!;
                if (tc.id) entry.id = tc.id;
                if (tc.function?.name) entry.name = tc.function.name;
                if (tc.function?.arguments) entry.arguments += tc.function.arguments;
              }
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Build tool_calls array
      const toolCalls: ToolCall[] = [];
      for (const [, entry] of [...toolCallsMap.entries()].sort((a, b) => a[0] - b[0])) {
        toolCalls.push({
          id: entry.id,
          type: "function",
          function: {
            name: entry.name,
            arguments: entry.arguments,
          },
        });
      }

      return {
        content: fullContent || null,
        toolCalls,
        finishReason,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeout / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
