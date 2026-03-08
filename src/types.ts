/**
 * AI-64 :: Types
 */

// Tool call (OpenAI format)
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// Chat messages (OpenAI format — supports tool role)
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// Tool interface
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute(args: Record<string, string>): Promise<string>;
}

// OpenAI tools format for API requests
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// LLM structured response
export interface ChatResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

// LLM API response
export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
}

// Streaming chunk
export interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}
