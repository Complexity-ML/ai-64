/**
 * AI-64 :: Tool — Execute Code (via vllm-i64 sandbox)
 *
 * Runs code remotely on the vllm-i64 sandbox (/v1/execute).
 * Supports Python, Node.js, and Bash.
 */

import type { Tool } from "../types.js";

export class ExecuteTool implements Tool {
  name = "execute_code";
  description = "Run code in the vllm-i64 sandbox (python, node, bash)";
  args = "ARG: code=<code>\nARG: language=<python|node|bash>";
  private apiUrl: string;
  private sessionId: string;
  private timeout: number;

  constructor(apiUrl: string, sessionId: string, timeout = 30_000) {
    this.apiUrl = apiUrl.replace(/\/+$/, "");
    this.sessionId = sessionId;
    this.timeout = timeout;
  }

  async execute(args: Record<string, string>): Promise<string> {
    const code = args.code;
    if (!code) return "ERROR: Missing 'code' argument.";

    const language = args.language || "python";

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const res = await fetch(`${this.apiUrl}/v1/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify({ code, language }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        return `ERROR: Sandbox ${res.status}: ${text.slice(0, 500)}`;
      }

      const data = await res.json() as {
        stdout?: string;
        stderr?: string;
        exit_code?: number;
        timed_out?: boolean;
        duration_ms?: number;
      };

      const parts: string[] = [];
      if (data.stdout) parts.push(data.stdout);
      if (data.stderr) parts.push(`STDERR:\n${data.stderr}`);
      if (data.timed_out) parts.push("(execution timed out)");
      parts.push(`exit_code: ${data.exit_code ?? "?"}`);

      const result = parts.join("\n");
      if (result.length > 3000) return result.slice(0, 3000) + "\n... (truncated)";
      return result || "(no output)";
    } catch (err: any) {
      if (err.name === "AbortError") return `ERROR: Timed out after ${this.timeout / 1000}s.`;
      if (err.cause?.code === "ECONNREFUSED") return `ERROR: Cannot connect to sandbox at ${this.apiUrl}`;
      return `ERROR: ${err.message}`;
    }
  }
}
