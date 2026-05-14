import type { ToolCostState } from "./types.js"

export function formatReport(state: ToolCostState, sessionID: string): string {
  const lines: string[] = []
  const maxToolLen = Math.max(
    ...state.tools.map((t) => t.tool.length),
    4,
  )
  const barWidth = 20
  const isFree = state.totalCost === 0 && state.totalOutputTokens > 0

  const label = isFree ? "ToolCost Report [local]" : "ToolCost Report"
  lines.push("=".repeat(60))
  lines.push(`${label} — Session ${sessionID.slice(0, 12)}...`)
  lines.push("=".repeat(60))
  lines.push("")

  if (state.tools.length === 0) {
    lines.push("No tool calls recorded in this session yet.")
    lines.push("")
    lines.push("ToolCost tracks per-tool token usage and cost attribution.")
    lines.push("When the LLM calls tools in a step, output tokens and cost")
    lines.push("for that step are split equally among the tools used.")
    lines.push("")
    lines.push("Start a conversation and let the LLM call tools (read,")
    lines.push("edit, search, write, etc.), then run /toolcost again to")
    lines.push("see the detailed per-tool breakdown.")
    lines.push("")
    return lines.join("\n")
  }

  const maxVal = isFree
    ? Math.max(...state.tools.map((t) => t.outputTokens), 1)
    : Math.max(...state.tools.map((t) => t.cost), 0.001)

  if (isFree) {
    lines.push(`${"TOOL".padEnd(maxToolLen)}  ${"TOKENS".padEnd(8)}  %`.trimEnd())
  } else {
    lines.push(`${"TOOL".padEnd(maxToolLen)}  ${"TOKENS".padEnd(8)}  ${"COST".padEnd(8)}  %`.trimEnd())
  }
  lines.push("─".repeat(60))

  for (const t of state.tools) {
    const val = isFree ? t.outputTokens : t.cost
    const barLen = Math.round((val / maxVal) * barWidth)
    const bar = "█".repeat(Math.max(1, barLen))
    const costCol = isFree
      ? ""
      : `  $${t.cost.toFixed(4).padEnd(7)}`
    const pct = isFree
      ? ((t.outputTokens / state.totalOutputTokens) * 100).toFixed(1)
      : state.totalCost > 0
        ? ((t.cost / state.totalCost) * 100).toFixed(1)
        : "0.0"
    lines.push(
      `${t.tool.padEnd(maxToolLen)}  ${String(t.outputTokens).padEnd(8)}${costCol}  ${pct}%  ${bar}`,
    )
  }

  lines.push("─".repeat(60))
  if (isFree) {
    lines.push(
      `${"TOTAL".padEnd(maxToolLen)}  ${String(state.totalOutputTokens).padEnd(8)}  100%  FREE [local]`,
    )
  } else {
    lines.push(
      `${"TOTAL".padEnd(maxToolLen)}  ${String(state.totalOutputTokens).padEnd(8)}  $${state.totalCost.toFixed(4).padEnd(7)}  100%`,
    )
  }
  lines.push("")
  lines.push(`Steps: ${state.stepCount}`)
  lines.push(`Total API calls in tools: ${state.tools.reduce((s, t) => s + t.callCount, 0)}`)
  lines.push("")

  return lines.join("\n")
}
