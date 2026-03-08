/**
 * AI-64 :: Configuration
 */

export interface Config {
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  maxSteps: number;
  contextMaxTokens: number;
  projectRoot: string;
  execTimeout: number;
  sessionId: string;
}

export const defaultConfig: Config = {
  apiUrl: "http://localhost:8000",
  model: "pacific-i64",
  maxTokens: 100,
  temperature: 0.3,
  maxSteps: 15,
  contextMaxTokens: 2000,
  projectRoot: process.cwd(),
  execTimeout: 30_000,
  sessionId: "ai-64",
};

export function createConfig(overrides: Partial<Config> = {}): Config {
  // Filter out undefined values so they don't overwrite defaults
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) clean[k] = v;
  }
  return { ...defaultConfig, ...clean } as Config;
}
