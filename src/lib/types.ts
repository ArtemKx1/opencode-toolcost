export interface ToolCostEntry {
  tool: string
  callCount: number
  outputTokens: number
  cost: number
}

export interface ToolCostState {
  tools: ToolCostEntry[]
  totalCost: number
  totalOutputTokens: number
  stepCount: number
}

export interface StepToolUse {
  tool: string
}

export interface PricingEntry {
  inputPer1M: number
  outputPer1M: number
  cacheReadPer1M: number
  cacheWritePer1M: number
}
