# opencode-toolcost

Real-time per-tool token cost breakdown in the OpenCode TUI sidebar.

Shows which tools (`read`, `edit`, `bash`, `grep`, etc.) consume the most tokens and cost in your current session — updated live as you work.

## Features

- **TUI Sidebar Panel**: Real-time TOOL COST block showing top 5 tools by cost with visual bars
- **`/toolcost` Command**: Detailed per-tool report saved to `toolcost-output.txt`
- **Per-Step Attribution**: Output tokens are attributed to tools using equal-split heuristic
- **Live Updates**: Panel refreshes automatically as new messages arrive

## Install

### Server plugin — `opencode.json`:

```json
{
  "plugin": ["@artem.k/opencode-toolcost"]
}
```

### TUI plugin — `tui.json`:

```json
{
  "plugin": ["@artem.k/opencode-toolcost"]
}
```

For OpenCode `>=1.2.15`, keep server plugins in `opencode.json` and TUI plugins in `tui.json`.

Restart OpenCode.

## Usage

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

## How It Works

The plugin listens to message events and calculates per-tool cost attribution:

1. Each LLM step produces a `step-finish` part with `tokens` and `cost`
2. Tool calls in the same message are collected
3. Output tokens are split equally across tools called in that step
4. Costs are calculated from the step-level cost using the same split

## What The Sidebar Shows

- **Top 5 tools** by cost (others grouped as "other")
- **Visual bar** proportional to cost
- **Total cost** for the session
- **Step count**

---

Created by [Artem K.](https://github.com/ArtemKx1) with ❤

For issues, feature requests, or feedback:  
- GitHub Issues: https://github.com/ArtemKx1/opencode-toolcost/issues

## License

MIT
