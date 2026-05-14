import type { PricingEntry } from "./types.js"

const LOCAL_ZERO: PricingEntry = {
  inputPer1M: 0,
  outputPer1M: 0,
  cacheReadPer1M: 0,
  cacheWritePer1M: 0,
}

const PRICING: Record<string, PricingEntry> = {
  "opencode:big-pickle": LOCAL_ZERO,
  "opencode:local": LOCAL_ZERO,
  "anthropic:claude-sonnet-4-20250514": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
  },
  "anthropic:claude-opus-4-20250514": {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cacheReadPer1M: 1.5,
    cacheWritePer1M: 18.75,
  },
  "anthropic:claude-3-5-sonnet-latest": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
  },
  "anthropic:claude-3-7-sonnet-latest": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
  },
  "anthropic:claude-3-5-haiku-latest": {
    inputPer1M: 0.8,
    outputPer1M: 4.0,
    cacheReadPer1M: 0.08,
    cacheWritePer1M: 1.0,
  },
  "anthropic:claude-3-opus-latest": {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cacheReadPer1M: 1.5,
    cacheWritePer1M: 18.75,
  },
  "openai:gpt-4.1": {
    inputPer1M: 2.0,
    outputPer1M: 8.0,
    cacheReadPer1M: 0.5,
    cacheWritePer1M: 0.5,
  },
  "openai:gpt-4o": {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
    cacheReadPer1M: 1.25,
    cacheWritePer1M: 1.25,
  },
  "openai:gpt-4o-mini": {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    cacheReadPer1M: 0.075,
    cacheWritePer1M: 0.075,
  },
  "openai:o3-mini": {
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cacheReadPer1M: 0.55,
    cacheWritePer1M: 0.55,
  },
  "openai:o4-mini": {
    inputPer1M: 1.1,
    outputPer1M: 4.4,
    cacheReadPer1M: 0.275,
    cacheWritePer1M: 0.275,
  },
  "gemini:gemini-2.5-flash-preview-04-17": {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    cacheReadPer1M: 0,
    cacheWritePer1M: 0,
  },
  "gemini:gemini-2.5-pro-preview-05-06": {
    inputPer1M: 1.25,
    outputPer1M: 10.0,
    cacheReadPer1M: 0,
    cacheWritePer1M: 0,
  },
}

const FALLBACK: PricingEntry = {
  inputPer1M: 3.0,
  outputPer1M: 15.0,
  cacheReadPer1M: 0.3,
  cacheWritePer1M: 3.75,
}

export function getPricing(
  providerID: string,
  modelID: string,
): PricingEntry | undefined {
  const key = `${providerID}:${modelID}`
  const keyProvider = PRICING[`${providerID}:`]
  return PRICING[key] ?? keyProvider
}

export function calcCost(
  pricing: PricingEntry,
  inputTokens: number,
  outputTokens: number,
  cacheRead: number,
  cacheWrite: number,
): number {
  return (
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M +
    (cacheRead / 1_000_000) * pricing.cacheReadPer1M +
    (cacheWrite / 1_000_000) * pricing.cacheWritePer1M
  )
}

export function outputCost(
  pricing: PricingEntry,
  outputTokens: number,
): number {
  return (outputTokens / 1_000_000) * pricing.outputPer1M
}
