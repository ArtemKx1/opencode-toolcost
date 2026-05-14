import type { ToolCostEntry, ToolCostState, StepToolUse } from "./types.js"

const EQUAL_WEIGHT = 1

function toolWeight(_tool: string): number {
  return EQUAL_WEIGHT
}

export function attributeStep(
  outputTokens: number,
  toolUses: StepToolUse[],
): ToolCostEntry[] {
  if (toolUses.length === 0) return []

  const totalWeight = toolUses.reduce(
    (sum, t) => sum + toolWeight(t.tool),
    0,
  )

  return toolUses.map((t) => {
    const share = toolWeight(t.tool) / totalWeight
    return {
      tool: t.tool,
      callCount: 1,
      outputTokens: Math.round(outputTokens * share),
      cost: 0,
    }
  })
}

export function attributeStepWithCost(
  outputTokens: number,
  stepCost: number,
  toolUses: StepToolUse[],
): ToolCostEntry[] {
  const entries = attributeStep(outputTokens, toolUses)
  if (entries.length === 0) return []

  const totalWeight = toolUses.reduce(
    (sum, t) => sum + toolWeight(t.tool),
    0,
  )

  return entries.map((e, i) => {
    const share = toolWeight(toolUses[i].tool) / totalWeight
    return { ...e, cost: stepCost * share }
  })
}

export function mergeEntries(
  existing: ToolCostState,
  newEntries: ToolCostEntry[],
): ToolCostState {
  const map = new Map<string, ToolCostEntry>()

  for (const e of [...existing.tools, ...newEntries]) {
    const prev = map.get(e.tool)
    if (prev) {
      map.set(e.tool, {
        tool: e.tool,
        callCount: prev.callCount + e.callCount,
        outputTokens: prev.outputTokens + e.outputTokens,
        cost: prev.cost + e.cost,
      })
    } else {
      map.set(e.tool, { ...e })
    }
  }

  const tools = Array.from(map.values()).sort((a, b) => b.cost - a.cost)

  return {
    tools,
    totalCost: tools.reduce((s, t) => s + t.cost, 0),
    totalOutputTokens: tools.reduce((s, t) => s + t.outputTokens, 0),
    stepCount: existing.stepCount + (newEntries.length > 0 ? 1 : 0),
  }
}

export function emptyState(): ToolCostState {
  return { tools: [], totalCost: 0, totalOutputTokens: 0, stepCount: 0 }
}
