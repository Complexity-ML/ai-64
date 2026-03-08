/**
 * AI-64 :: Agent Loop — think -> act -> observe -> repeat
 *
 * Uses native OpenAI tool_calls with streaming for live output.
 */

import type { Config } from "./config.js";
import type { ToolDefinition } from "./types.js";
import { LLMClient } from "./llm/client.js";
import { buildToolDefinitions } from "./llm/prompt.js";
import { ToolRegistry } from "./tools/registry.js";
import { ContextManager } from "./context/manager.js";
import * as ui from "./ui/display.js";

export class Agent {
  private config: Config;
  private llm: LLMClient;
  private tools: ToolRegistry;
  private context: ContextManager;
  private toolDefs: ToolDefinition[];
  public debug = false;

  constructor(
    config: Config,
    llm: LLMClient,
    tools: ToolRegistry,
    context: ContextManager,
  ) {
    this.config = config;
    this.llm = llm;
    this.tools = tools;
    this.context = context;
    this.toolDefs = buildToolDefinitions(tools.list());
  }

  async run(task: string) {
    this.context.addUser(task);

    for (let step = 1; step <= this.config.maxSteps; step++) {
      ui.step(step, this.config.maxSteps);

      const msgs = this.context.getMessages();
      if (this.debug) {
        ui.info(`[DEBUG] Sending ${msgs.length} messages (~${JSON.stringify(msgs).length} chars)`);
      }

      // Stream response from model
      let hasContent = false;
      const response = await this.llm.chatStream(
        msgs,
        this.toolDefs,
        (token) => {
          if (!hasContent) {
            hasContent = true;
            process.stdout.write("\n");
          }
          process.stdout.write(token);
        },
      ).catch((err) => {
        ui.error(err.message);
        return null;
      });

      if (!response) return;
      if (hasContent) process.stdout.write("\n");

      if (this.debug) {
        ui.info(`[DEBUG] finish_reason=${response.finishReason} tool_calls=${response.toolCalls.length}`);
      }

      if (response.toolCalls.length > 0) {
        // Record assistant message with tool_calls
        this.context.addAssistant(response.content, response.toolCalls);

        // Execute each tool call
        for (const tc of response.toolCalls) {
          const name = tc.function.name;
          let args: Record<string, string>;
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            ui.error(`Failed to parse arguments for ${name}: ${tc.function.arguments}`);
            this.context.addToolResult(tc.id, "ERROR: Invalid JSON arguments");
            continue;
          }

          ui.toolCall(name, args);

          const spinner = ui.createSpinner(`Running ${name}...`);
          spinner.start();
          const result = await this.tools.execute(name, args);
          spinner.stop();

          ui.toolResult(result);
          this.context.addToolResult(tc.id, result);
        }
      } else {
        // No tool calls = final answer
        this.context.addAssistant(response.content);
        if (response.content) {
          console.log();
        }
        return;
      }
    }

    ui.error(`Reached max steps (${this.config.maxSteps}). Stopping.`);
  }

  reset() {
    this.context.reset();
  }
}
