/** @jsxImportSource @opentui/solid */
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import type { ToolCostState, ToolCostEntry } from "./lib/types.js"
import {
  attributeStepWithCost,
  mergeEntries,
  emptyState,
} from "./lib/attribution.js"
import { getPricing, outputCost } from "./lib/pricing.js"

const ID = "artemk.toolcost"
const BAR_CHAR = "█"
const BAR_WIDTH = 12

interface LocalMsg {
  id: string
  role: string
  cost?: number
  tokens?: { output?: number; input?: number }
  providerID?: string
  modelID?: string
}

interface LocalPart {
  type: string
  tool?: string
  tokens?: { output?: number; input?: number }
  cost?: number
}

function getToolNames(parts: LocalPart[]): string[] {
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

function getStepFinishes(parts: LocalPart[]): { tokens: { output: number }; cost: number }[] {
  const result: { tokens: { output: number }; cost: number }[] = []
  for (const p of parts) {
    if (p.type === "step-finish") {
      result.push({
        tokens: { output: p.tokens?.output ?? 0 },
        cost: p.cost ?? 0,
      })
    }
  }
  return result
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

function calcState(messages: LocalMsg[], partsMap: Map<string, LocalPart[]>): ToolCostState {
  let state = emptyState()

  for (const msg of messages) {
    if (msg.role !== "assistant") continue
    const parts = partsMap.get(msg.id) ?? []

    const finishes = getStepFinishes(parts)
    if (finishes.length === 0) {
      const tools = getToolNames(parts)
      if (tools.length === 0) continue
      const stepCost = resolveStepCost(
        msg.tokens?.output ?? 0,
        msg.cost ?? 0,
        msg.providerID,
        msg.modelID,
      )
      state = mergeEntries(
        state,
        attributeStepWithCost(msg.tokens?.output ?? 0, stepCost, tools.map((t) => ({ tool: t }))),
      )
      continue
    }

    const toolsPerStep = splitTools(parts, finishes.length)
    for (let i = 0; i < finishes.length; i++) {
      const tools = toolsPerStep[i]
      if (tools.length === 0) continue
      const stepCost = resolveStepCost(
        finishes[i].tokens.output,
        finishes[i].cost,
        msg.providerID,
        msg.modelID,
      )
      state = mergeEntries(
        state,
        attributeStepWithCost(finishes[i].tokens.output, stepCost, tools.map((t) => ({ tool: t }))),
      )
    }
  }

  return state
}

function splitTools(parts: LocalPart[], stepCount: number): string[][] {
  const allTools = getToolNames(parts)
  if (stepCount <= 1 || allTools.length === 0) return [allTools]
  const perStep = Math.ceil(allTools.length / stepCount)
  const result: string[][] = []
  for (let i = 0; i < stepCount; i++) {
    result.push(allTools.slice(i * perStep, (i + 1) * perStep))
  }
  return result
}

function ToolCostSidebar(props: { api: TuiPluginApi; sessionID: string }) {
  const [state, setState] = createSignal<ToolCostState>(emptyState())

  function reload() {
    try {
      const messages = props.api.state.session
        .messages(props.sessionID) as unknown as LocalMsg[]

      const partsMap = new Map<string, LocalPart[]>()
      for (const msg of messages) {
        try {
          partsMap.set(msg.id, [...(props.api.state.part(msg.id) as unknown as LocalPart[])])
        } catch {
          partsMap.set(msg.id, [])
        }
      }

      setState(calcState(messages, partsMap))
    } catch {
      setState(emptyState())
    }
  }

  reload()

  const timers = new Set<ReturnType<typeof setTimeout>>()
  function scheduleRefresh() {
    for (const delay of [100, 400, 1000]) {
      const t = setTimeout(() => {
        timers.delete(t)
        reload()
      }, delay)
      timers.add(t)
    }
  }

  // Retry after mount for session sync
  for (const delay of [500, 1500]) {
    const t = setTimeout(() => {
      timers.delete(t)
      reload()
    }, delay)
    timers.add(t)
  }

  const unsubs = [
    props.api.event.on("message.updated", (ev) => {
      if ((ev.properties.info as any)?.sessionID === props.sessionID) scheduleRefresh()
    }),
    props.api.event.on("message.removed", (ev) => {
      if (ev.properties.sessionID === props.sessionID) scheduleRefresh()
    }),
    props.api.event.on("session.updated", (ev) => {
      if (ev.properties.info.id === props.sessionID) scheduleRefresh()
    }),
  ]
  onCleanup(() => {
    for (const t of timers) clearTimeout(t)
    for (const u of unsubs) u()
  })

  const topTools = createMemo(() => {
    const s = state()
    const shown = s.tools.slice(0, 5)
    const rest = s.tools.slice(5)
    if (rest.length > 0) {
      shown.push({
        tool: "other",
        callCount: rest.reduce((a, t) => a + t.callCount, 0),
        outputTokens: rest.reduce((a, t) => a + t.outputTokens, 0),
        cost: rest.reduce((a, t) => a + t.cost, 0),
      })
    }
    return shown
  })

  const restTools = createMemo(() => state().tools.slice(5))

  const isFree = createMemo(() => state().totalCost === 0 && state().totalOutputTokens > 0)
  const isMixed = createMemo(() => state().totalCost > 0 && state().tools.some((t) => t.cost === 0))
  const maxVal = createMemo(() => {
    const t = topTools()
    if (isFree()) return Math.max(...t.map((e) => e.outputTokens), 1)
    return Math.max(...t.map((e) => e.cost), 0.001)
  })
  const hasData = createMemo(() => state().tools.length > 0)
  const costStr = createMemo(() => {
    if (isFree()) return ""
    const c = state().totalCost
    if (c >= 1) return `$${c.toFixed(2)}`
    if (c >= 0.01) return `$${c.toFixed(3)}`
    return `$${c.toFixed(4)}`
  })
  const stepStr = createMemo(() => `${state().stepCount} step${state().stepCount !== 1 ? "s" : ""}`)

  return (
    <box gap={0}>
      <box flexDirection="row" gap={1}>
        <text fg={props.api.theme.current.text}>
          <b>TOOL COST</b>
        </text>
        <Show when={isFree()}>
          <text fg={props.api.theme.current.success}>[local]</text>
        </Show>
        <Show when={isMixed()}>
          <text fg={props.api.theme.current.textMuted}>[mixed]</text>
        </Show>
      </box>
      <Show when={hasData()}>
        <box gap={0}>
          <For each={topTools()}>
            {(entry) => {
              const barLen = () => {
                const val = isFree() ? entry.outputTokens : entry.cost
                return Math.round((val / maxVal()) * BAR_WIDTH)
              }
              const bar = () => BAR_CHAR.repeat(Math.max(1, barLen()))
              const suffix = () => {
                if (isFree()) return String(entry.outputTokens).padStart(5)
                if (isMixed() && entry.cost === 0) return " FREE".padStart(6)
                const c = entry.cost
                if (c >= 0.01) return `$${c.toFixed(2).padStart(5)}`
                return `$${c.toFixed(4)}`
              }
              const toolName = () =>
                entry.tool.length > 8 ? entry.tool.slice(0, 7) + "." : entry.tool.padEnd(8)
              return (
                <box gap={0}>
                  <box flexDirection="row" gap={0}>
                    <text fg={props.api.theme.current.text}>{toolName()}</text>
                    <text fg={props.api.theme.current.accent}> {bar()}</text>
                    <text fg={props.api.theme.current.textMuted}> {suffix()}</text>
                  </box>
                  <Show when={entry.tool === "other"}>
                    <For each={restTools()}>
                      {(sub) => {
                        const subSuffix = () => {
                          if (isFree()) return String(sub.outputTokens).padStart(5)
                          if (isMixed() && sub.cost === 0) return " FREE".padStart(6)
                          const c = sub.cost
                          if (c >= 0.01) return `$${c.toFixed(2).padStart(5)}`
                          return `$${c.toFixed(4)}`
                        }
                        return (
                          <box flexDirection="row" gap={0}>
                            <text fg={props.api.theme.current.textMuted}>  {sub.tool.padEnd(8)}</text>
                            <text fg={props.api.theme.current.textMuted}> {subSuffix()}</text>
                          </box>
                        )
                      }}
                    </For>
                  </Show>
                </box>
              )
            }}
          </For>
        </box>
        <text fg={props.api.theme.current.textMuted}>{"─".repeat(20)}</text>
        <Show when={isFree()}>
          <box flexDirection="row" gap={1}>
            <text fg={props.api.theme.current.text}>Total</text>
            <text fg={props.api.theme.current.textMuted}>{String(state().totalOutputTokens)} tok</text>
          </box>
          <text fg={props.api.theme.current.success}>FREE</text>
        </Show>
        <Show when={!isFree()}>
          <box flexDirection="row" gap={1}>
            <text fg={props.api.theme.current.text}>Total</text>
            <text fg={props.api.theme.current.textMuted}>{costStr()}</text>
          </box>
          <Show when={isMixed()}>
            <text fg={props.api.theme.current.textMuted}>{String(state().totalOutputTokens)} tok</text>
          </Show>
        </Show>
        <text fg={props.api.theme.current.textMuted}>{stepStr()}</text>
      </Show>
      <Show when={!hasData()}>
        <text fg={props.api.theme.current.textMuted}>waiting for tool calls...</text>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, props: { session_id: string }) {
        return <ToolCostSidebar api={api} sessionID={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: ID,
  tui,
}

export default plugin
