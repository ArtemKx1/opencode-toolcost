<div align="center">

# 💰 opencode-toolcost

### See exactly how much each tool is costing you — live in the OpenCode TUI sidebar

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@artem-kuprin/opencode-toolcost)](https://www.npmjs.com/package/@artem-kuprin/opencode-toolcost)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-blue)](https://opencode.ai)

</div>

---

## ✨ Why opencode-toolcost?

Other cost trackers show you the **total bill**. This one tells you **what exactly you're paying for**:

> Is `read` eating your budget? Is `edit` more expensive than `bash`? Is `task` running away with your tokens?

**opencode-toolcost** breaks down every dollar by tool — live, in your sidebar, while you work. No guesswork, no math.

| Compared to | opencode-toolcost |
|---|---|
| Generic cost dashboards | ❌ Show total only | ✅ **Per-tool breakdown** |
| Manual log analysis | ❌ Retrospective | ✅ **Live in TUI sidebar** |
| Built-in OpenCode stats | ❌ No per-tool view | ✅ **Granular attribution** |

---

## 🚀 Features

- **📊 Live TUI sidebar** — top 5 costliest tools with visual bars, updated automatically
- **🎯 Per-tool attribution** — knows exactly which tool caused each step's cost
- **💬 `/toolcost` command** — saves a detailed text report to `toolcost-output.txt`
- **🔄 Auto-refresh** — panel updates as new messages arrive, no manual reload
- **🆓 Works with any model/provider** — reads cost from API metadata, falls back to built-in pricing table

---

## 📦 Install

### Server plugin — `opencode.json`:

```json
{
  "plugin": ["@artem-kuprin/opencode-toolcost"]
}
```

### TUI plugin — `tui.json`:

```json
{
  "plugin": ["@artem-kuprin/opencode-toolcost"]
}
```

For OpenCode `>=1.2.15`, keep server plugins in `opencode.json` and TUI plugins in `tui.json`.

Restart OpenCode.

---

## 🎮 Usage

The TUI sidebar will show a `TOOL COST` block during active sessions. Before any tool calls, it shows:

```
TOOL COST
  waiting for tool calls...
```

Once the LLM starts calling tools, it switches to the live breakdown:

```
TOOL COST
  edit     ████████████ $0.0123
  read     ████████     $0.0081
  bash     ██████       $0.0060
  grep     ████         $0.0042
  task     ██           $0.0021
  ────────────────────
  Total                $0.0327
  12 steps
```

For a detailed report, run `/toolcost` in chat. The report is saved to `toolcost-output.txt`.

---

## ⚙️ How It Works

1. Each LLM step emits a `step-finish` part with `tokens` and `cost` metadata
2. All tool calls in that message are collected
3. Output tokens are **split equally** across the tools called in that step
4. Cost is attributed using the same split
5. Results accumulate across the entire session

---

## 📐 What The Sidebar Shows

| Block | Description |
|---|---|
| **Top 5 tools** | Costliest tools ranked, others grouped as "other" |
| **Visual bar** | Proportional to tool's cost share |
| **Total cost** | Cumulative session cost |
| **Step count** | Number of LLM steps processed |

---

<div align="center">

Created with ❤️ by [Artem K.](https://github.com/ArtemKx1)

**Feedback? Ideas?** [Open an issue](https://github.com/ArtemKx1/opencode-toolcost/issues)

</div>

## License

MIT
