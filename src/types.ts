/**
 * AI-64 :: Types
 */

// Chat messages (OpenAI format)
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Parsed model response
export interface ParsedResponse {
  think: string | null;
  toolName: string | null;
  toolArgs: Record<string, string>;
  text: string;
}

// Tool interface
export interface Tool {
  name: string;
  description: string;
  args: string;
  execute(args: Record<string, string>): Promise<string>;
}

// LLM API response
export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
}

// Streaming chunk
export interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}
