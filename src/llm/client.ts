/**
 * AI-64 :: LLM Client — talks to vllm-i64 OpenAI-compatible API
 *
 * Supports both regular and streaming responses.
 */

import type { ChatMessage, ChatCompletionResponse, ChatCompletionChunk } from "../types.js";

export class LLMClient {
  private apiUrl: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private timeout: number;

  constructor(opts: {
    apiUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
  }) {
    this.apiUrl = opts.apiUrl.replace(/\/+$/, "");
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.temperature = opts.temperature;
    this.timeout = 300_000; // 5min — HF free tier can be slow
  }

  /** Send messages and get full response. */
  async chat(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      return data.choices[0].message.content;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeout / 1000}s`);
      }
      if (err.cause?.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to ${this.apiUrl}. Is vllm-i64 running?`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Stream response token by token, calling onToken for each chunk. */
  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }

      let full = "";
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
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              full += content;
              onToken(content);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      return full;
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
