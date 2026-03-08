#!/usr/bin/env node

/**
 * AI-64 :: CLI Entry Point
 *
 * Usage:
 *   ai-64 "list all python files"
 *   ai-64 --api-url http://localhost:8000
 *   ai-64   (interactive REPL)
 */

import { createInterface } from "node:readline";
import { createConfig } from "./config.js";
import { LLMClient } from "./llm/client.js";
import { createDefaultRegistry } from "./tools/registry.js";
import { ContextManager } from "./context/manager.js";
import { Agent } from "./agent.js";
import * as ui from "./ui/display.js";
import chalk from "chalk";

interface ParsedArgs {
  apiUrl?: string;
  model?: string;
  maxSteps?: string;
  projectRoot?: string;
  temperature?: string;
  sessionId?: string;
  debug?: string;
  task?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  let task: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--api-url" && argv[i + 1]) {
      args.apiUrl = argv[++i];
    } else if (arg === "--model" && argv[i + 1]) {
      args.model = argv[++i];
    } else if (arg === "--max-steps" && argv[i + 1]) {
      args.maxSteps = argv[++i];
    } else if (arg === "--project-root" && argv[i + 1]) {
      args.projectRoot = argv[++i];
    } else if (arg === "--temperature" && argv[i + 1]) {
      args.temperature = argv[++i];
    } else if (arg === "--session-id" && argv[i + 1]) {
      args.sessionId = argv[++i];
    } else if (arg === "--debug") {
      args.debug = "true";
    } else if (arg === "-h" || arg === "--help") {
      console.log(`
${chalk.bold("AI-64")} — Coding agent powered by Pacific-i64

${chalk.dim("Usage:")}
  ai-64 "fix the bug in main.py"     ${chalk.dim("# one-shot")}
  ai-64                               ${chalk.dim("# interactive REPL")}

${chalk.dim("Options:")}
  --api-url <url>       vllm-i64 API URL (default: http://localhost:8000)
  --model <name>        Model name (default: pacific-i64)
  --max-steps <n>       Max agent steps (default: 15)
  --project-root <dir>  Project root (default: cwd)
  --temperature <f>     Temperature (default: 0.3)
  --session-id <id>     Session ID for event tracking (default: ai-64)
  --debug               Verbose output
  -h, --help            Show this help
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      task = arg;
    }
  }

  args.task = task;
  return args;
}

async function main() {
  const parsed = parseArgs(process.argv);

  const config = createConfig({
    apiUrl: parsed.apiUrl,
    model: parsed.model,
    maxSteps: parsed.maxSteps ? parseInt(parsed.maxSteps) : undefined,
    projectRoot: parsed.projectRoot,
    temperature: parsed.temperature ? parseFloat(parsed.temperature) : undefined,
    sessionId: parsed.sessionId,
  });

  const llm = new LLMClient({
    apiUrl: config.apiUrl,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    sessionId: config.sessionId,
  });

  const tools = createDefaultRegistry(config.projectRoot, config.apiUrl, config.sessionId, config.execTimeout);
  const context = new ContextManager(
    tools.list(),
    config.projectRoot,
    config.contextMaxTokens
  );
  const agent = new Agent(config, llm, tools, context);
  if (parsed.debug) agent.debug = true;

  if (parsed.task) {
    // One-shot mode
    await agent.run(parsed.task);
  } else {
    // Interactive REPL
    ui.banner();
    ui.info(`API: ${config.apiUrl}`);
    ui.info(`Session: ${config.sessionId}`);
    ui.info(`Project: ${config.projectRoot}`);
    ui.info(`Type 'exit' or Ctrl+C to quit.`);
    console.log();

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question(chalk.green("ai-64> "), async (input) => {
        const task = input.trim();

        if (!task) {
          prompt();
          return;
        }
        if (["exit", "quit", "q"].includes(task.toLowerCase())) {
          console.log("Bye!");
          rl.close();
          return;
        }

        await agent.run(task);
        agent.reset();
        prompt();
      });
    };

    rl.on("close", () => {
      console.log("\nBye!");
      process.exit(0);
    });

    prompt();
  }
}

main().catch((err) => {
  ui.error(err.message);
  process.exit(1);
});
