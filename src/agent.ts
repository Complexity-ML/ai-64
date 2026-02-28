/**
 * AI-64 :: Agent Loop — think → act → observe → repeat
 */

import type { Config } from "./config.js";
import { LLMClient } from "./llm/client.js";
import { parseResponse } from "./llm/parser.js";
import { ToolRegistry } from "./tools/registry.js";
import { ContextManager } from "./context/manager.js";
import * as ui from "./ui/display.js";

export class Agent {
  private config: Config;
  private llm: LLMClient;
  private tools: ToolRegistry;
  private context: ContextManager;
  public debug = false;

  constructor(
    config: Config,
    llm: LLMClient,
    tools: ToolRegistry,
    context: ContextManager
  ) {
    this.config = config;
    this.llm = llm;
    this.tools = tools;
    this.context = context;
  }

  async run(task: string) {
    this.context.addUser(task);

    for (let step = 1; step <= this.config.maxSteps; step++) {
      ui.step(step, this.config.maxSteps);

      const msgs = this.context.getMessages();
      if (this.debug) {
        ui.info(`[DEBUG] Sending ${msgs.length} messages (~${JSON.stringify(msgs).length} chars)`);
      }

      // Ask the model
      const spinner = ui.createSpinner("Thinking...");
      spinner.start();

      let raw: string;
      try {
        raw = await this.llm.chat(msgs);
      } catch (err: any) {
        spinner.fail(err.message);
        return;
      }
      spinner.stop();

      if (this.debug) {
        ui.info(`[DEBUG] Response (${raw.length} chars):`);
        console.log(raw.slice(0, 500));
      }

      // Parse
      const parsed = parseResponse(raw);

      // Show thinking
      if (parsed.think) {
        ui.think(parsed.think);
      }

      if (parsed.toolName) {
        // Execute tool
        ui.toolCall(parsed.toolName, parsed.toolArgs);

        const spinner2 = ui.createSpinner(`Running ${parsed.toolName}...`);
        spinner2.start();
        const result = await this.tools.execute(parsed.toolName, parsed.toolArgs);
        spinner2.stop();

        ui.toolResult(result);

        // Feed back
        this.context.addAssistant(raw);
        this.context.addToolResult(parsed.toolName, result);
      } else {
        // No tool = done
        this.context.addAssistant(raw);
        if (parsed.text) {
          ui.response(parsed.text);
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
