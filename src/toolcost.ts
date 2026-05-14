import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import type { ToolCostState } from "./lib/types.js"
import {
  attributeStepWithCost,
  mergeEntries,
  emptyState,
} from "./lib/attribution.js"
import { formatReport } from "./lib/report.js"
import { getPricing, outputCost } from "./lib/pricing.js"
import fs from "node:fs/promises"
import path from "node:path"

const REPORT_FILENAME = "toolcost-output.txt"

interface PartData {
  type: string
  tool?: string
  tokens?: { output?: number; input?: number }
  cost?: number
}

interface MessageInfo {
  id: string
  role: string
  tokens?: { output?: number; input?: number }
  cost?: number
  providerID?: string
  modelID?: string
}

interface MessageData {
  info: MessageInfo
  parts: PartData[]
}

function getToolNames(parts: PartData[]): string[] {
  const seen = new Set<string>()
  const tools: string[] = []
  for (const p of parts) {
    if (p.type === "tool" && p.tool && !seen.has(p.tool)) {
      seen.add(p.tool)
      tools.push(p.tool)
    }
  }
  return tools
}

function getStepFinish(parts: PartData[]): { tokens: { output: number }; cost: number; reason: string } | null {
  for (const p of parts) {
    if (p.type === "step-finish") {
      return {
        tokens: { output: p.tokens?.output ?? 0 },
        cost: p.cost ?? 0,
        reason: "",
      }
    }
  }
  return null
}

function resolveStepCost(
  outputTokens: number,
  apiCost: number,
  providerID?: string,
  modelID?: string,
): number {
  if (apiCost > 0) return apiCost
  if (outputTokens <= 0 || !providerID || !modelID) return 0
  const pricing = getPricing(providerID, modelID)
  return pricing ? outputCost(pricing, outputTokens) : 0
}

function analyzeMessages(messages: MessageData[]): ToolCostState {
  let state = emptyState()

  for (const msg of messages) {
    if (msg.info.role !== "assistant") continue

    const sf = getStepFinish(msg.parts)
    if (!sf) continue

    const tools = getToolNames(msg.parts)
    if (tools.length === 0) continue

    const stepCost = resolveStepCost(
      sf.tokens.output,
      sf.cost,
      msg.info.providerID,
      msg.info.modelID,
    )

    const entries = attributeStepWithCost(
      sf.tokens.output,
      stepCost,
      tools.map((t) => ({ tool: t })),
    )
    state = mergeEntries(state, entries)
  }

  return state
}

export const ToolCostPlugin: Plugin = async ({ client }) => {
  return {
    tool: {
      toolcost: tool({
        description:
          "Show detailed per-tool token and cost breakdown for the current or specified session. " +
          "Outputs a report with cost per tool, token attribution, and step count.",
        args: {
          sessionID: tool.schema
            .string()
            .optional()
            .describe("Session ID to analyze. Defaults to current session."),
        },
        async execute(args, context) {
          const outputPath = path.join(process.cwd(), REPORT_FILENAME)
          const sessionID = args.sessionID ?? context.sessionID

          if (!sessionID) {
            return "No session ID available. Start a session first, or provide an explicit sessionID."
          }

          try {
            const response: any = await (client as any).session.messages({
              path: { id: sessionID },
            })
            const messages: MessageData[] = response?.data ?? response ?? []

            if (!Array.isArray(messages) || messages.length === 0) {
              return `Session ${sessionID} has no messages yet.`
            }

            const state = analyzeMessages(messages)
            const report = formatReport(state, sessionID)

            await fs.writeFile(outputPath, report, "utf-8")

            const toolCount = state.tools.length
            return [
              `Per-tool cost analysis complete for ${toolCount} tools. Total: $${state.totalCost.toFixed(4)}.`,
              `Full report saved to: ${outputPath}`,
              `Use: cat ${REPORT_FILENAME} (or read the file) to view the complete breakdown.`,
            ].join("\n")
          } catch (error: any) {
            return `ToolCost analysis failed: ${error?.message ?? error}`
          }
        },
      }),
    },
  }
}

export default ToolCostPlugin
