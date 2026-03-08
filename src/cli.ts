#!/usr/bin/env node

/**
 * AI-64 :: CLI Entry Point
 *
 * Usage:
 *   ai-64 "list all python files"
 *   ai-64 --parallel "task 1" "task 2" "task 3"
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
  parallel: boolean;
  tasks: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { parallel: false, tasks: [] };

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
    } else if (arg === "--parallel" || arg === "-p") {
      args.parallel = true;
    } else if (arg === "--debug") {
      args.debug = "true";
    } else if (arg === "-h" || arg === "--help") {
      console.log(`
${chalk.bold("AI-64")} — Coding agent powered by Pacific-i64

${chalk.dim("Usage:")}
  ai-64 "fix the bug in main.py"                         ${chalk.dim("# one-shot")}
  ai-64 --parallel "task 1" "task 2" "task 3"             ${chalk.dim("# multi-agent")}
  ai-64                                                   ${chalk.dim("# interactive REPL")}

${chalk.dim("Options:")}
  --api-url <url>       vllm-i64 API URL (default: http://localhost:8000)
  --model <name>        Model name (default: pacific-i64)
  --max-steps <n>       Max agent steps (default: 15)
  --project-root <dir>  Project root (default: cwd)
  --temperature <f>     Temperature (default: 0.3)
  --session-id <id>     Session ID for event tracking (default: ai-64)
  --parallel, -p        Run multiple tasks in parallel (multi-agent)
  --debug               Verbose output
  -h, --help            Show this help
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      args.tasks.push(arg);
    }
  }

  return args;
}

function createAgent(
  config: ReturnType<typeof createConfig>,
  sessionId: string,
  debug: boolean,
): Agent {
  const llm = new LLMClient({
    apiUrl: config.apiUrl,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    sessionId,
  });
  const tools = createDefaultRegistry(config.projectRoot, config.apiUrl, sessionId, config.execTimeout);
  const context = new ContextManager(config.projectRoot, config.contextMaxTokens);
  const agent = new Agent(config, llm, tools, context);
  if (debug) agent.debug = true;
  return agent;
}

async function runParallel(
  config: ReturnType<typeof createConfig>,
  tasks: string[],
  debug: boolean,
) {
  const baseSession = config.sessionId;

  console.log(
    chalk.cyan(`\n  Multi-agent: ${tasks.length} tasks, ${tasks.length} workers\n`),
  );

  // Collect results in order
  const results: { task: string; ok: boolean; elapsed: number }[] = [];

  // Run all agents concurrently — each gets its own session ID
  const promises = tasks.map(async (task, i) => {
    const agentId = i + 1;
    const sessionId = `${baseSession}-agent-${agentId}`;
    const agent = createAgent(config, sessionId, debug);
    const tag = chalk.yellow(`[Agent ${agentId}]`);

    console.log(`${tag} ${chalk.dim(task.slice(0, 80))}`);

    const start = performance.now();
    try {
      await agent.run(task);
      const elapsed = performance.now() - start;
      results[i] = { task, ok: true, elapsed };
      console.log(`${tag} ${chalk.green("done")} ${chalk.dim(`(${(elapsed / 1000).toFixed(1)}s)`)}`);
    } catch (err: any) {
      const elapsed = performance.now() - start;
      results[i] = { task, ok: false, elapsed };
      console.log(`${tag} ${chalk.red("failed")}: ${err.message}`);
    }
  });

  await Promise.all(promises);

  // Summary
  const succeeded = results.filter((r) => r.ok).length;
  const totalMs = results.reduce((s, r) => s + r.elapsed, 0);
  console.log(
    chalk.cyan(
      `\n  Done: ${succeeded}/${tasks.length} succeeded, ${(totalMs / 1000).toFixed(1)}s total\n`,
    ),
  );
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

  if (parsed.parallel && parsed.tasks.length > 1) {
    // Multi-agent parallel mode
    await runParallel(config, parsed.tasks, !!parsed.debug);
  } else if (parsed.tasks.length > 0) {
    // One-shot mode (single task)
    const agent = createAgent(config, config.sessionId, !!parsed.debug);
    await agent.run(parsed.tasks[0]);
  } else {
    // Interactive REPL
    const agent = createAgent(config, config.sessionId, !!parsed.debug);

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
