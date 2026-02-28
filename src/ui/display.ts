/**
 * AI-64 :: Terminal UI — colors, spinners, formatting
 */

import chalk from "chalk";
import ora from "ora";

export function banner() {
  console.log(
    chalk.green(`
╔══════════════════════════════════════════╗
║  ${chalk.bold("AI-64")} — Coding Agent                    ║
║  Powered by ${chalk.cyan("Pacific-i64")}                  ║
╚══════════════════════════════════════════╝
`)
  );
}

export function think(text: string) {
  console.log(chalk.dim(`  💭 ${text}`));
}

export function toolCall(name: string, args: Record<string, string>) {
  const argsStr = Object.entries(args)
    .map(([k, v]) => {
      const short = v.length > 60 ? v.slice(0, 57) + "..." : v;
      return `${k}=${short}`;
    })
    .join(", ");
  console.log(chalk.green(`  🔧 ${name}(${argsStr})`));
}

export function toolResult(result: string) {
  const lines = result.split("\n");
  const preview = lines.slice(0, 12).join("\n");
  const suffix = lines.length > 12 ? chalk.dim(`\n  ... (${lines.length} lines)`) : "";
  console.log(chalk.cyan(preview) + suffix);
}

export function response(text: string) {
  console.log(`\n${text}\n`);
}

export function error(text: string) {
  console.error(chalk.red(`  ❌ ${text}`));
}

export function step(current: number, max: number) {
  process.stdout.write(chalk.dim(`  [${current}/${max}] `));
}

export function info(text: string) {
  console.log(chalk.dim(`  ${text}`));
}

export function createSpinner(text: string) {
  return ora({ text, color: "cyan", spinner: "dots" });
}
