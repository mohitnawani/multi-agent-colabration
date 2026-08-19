# Design Tokens — Nexus Multi-Agent Orchestration

Source of truth: `src/index.css` (`@theme` block + component classes). This document is the rationale; the CSS is the implementation.

## Concept

**"The dispatcher's console."** The product is an orchestration control surface, so the UI reads like an instrument panel, not a marketing site: quiet graphite + warm paper surfaces, a restrained ink that owns all interactive affordances, and **color reserved exclusively for real state** — the five orchestration statuses (the "signal lamps") and the six agent roles.

A near-black **control-room panel** (`--panel-*`) is a second visual register used deliberately, and only where the product's story needs theater: the auth screen and the first-run dashboard empty state, where the route schematic lives.

## Core palette (light theme)

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-ink` | `#141B26` | Primary controls, headings, icon color. **Never** used as a status color. |
| `--color-console` | `#EEF1F5` | App canvas (the work surface). |
| `--color-sheet` | `#FFFFFF` | Cards, tables, forms (lighter than the canvas). |
| `--color-line` | `#D8DEE7` | Borders, hairlines, dividers. |
| `--color-ink-muted` | `#5C6675` | Secondary text, metadata. |
| `--color-ink-faint` | `#96A0B0` | Placeholders, disabled text, captions. |

Dark theme derives from the same tokens (`base-100 #10151F` etc.) so both themes share one semantic language.

## Signal lamps — status color system

Color only means something; a status. The five orchestration states are the product's only saturated colors in the light theme:

| Token | Hex | State |
| --- | --- | --- |
| `--color-lamp-idle` | `#2E5BA6` | Pending (queued, blueprint) |
| `--color-lamp-running` | `#A85B00` | Running (active work) |
| `--color-lamp-done` | `#157A4B` | Succeeded |
| `--color-lamp-failed` | `#B42318` | Failed |
| `--color-lamp-review` | `#6D4AC4` | Awaiting approval |

Colors are selected for discrimination at small sizes and tint fidelity in chips (`/8` backgrounds, `/22` rings): amber for *active*, green for *finished*, red for *broken*, violet for *human in the loop*.

## Role hues

Each agent role gets a hue for its avatar square and badge; dark-theme variants shift toward pastel (e.g. `role-blue-dark #9DB9E8`) to keep contrast on the dark panel:

| Role | Light | Dark variant |
| --- | --- | --- |
| researcher | `#2E5BA6` | `#9DB9E8` |
| writer | `#157A4B` | `#7FD4AB` |
| analyst | `#5C6675` | `#B6C0CF` |
| critic | `#6D4AC4` | `#B9A3F2` |
| developer | `#0F766E` | `#5FD0C7` |
| designer | `#BE3A6B` | `#F09BB6` |

## Control-room panel (dark register)

Used only on auth + first-run empty state, via the `.panel` class:

| Token | Hex | Usage |
| --- | --- | --- |
| `--panel` | `#10151F` | Panel base |
| `--panel-2` | `#171E2B` | Raised surfaces |
| `--panel-line` | `#232C3D` | Lines, hairlines |
| `--panel-text` | `#E8ECF3` | Primary text |
| `--panel-muted` | `#93A0B3` | Secondary text |
| `--lamp-*` | brighter lamp variants | Readable lamps on the dark field |

## Typography

Pairing recommended by the ui-ux-pro-max style database for data-dense operations tools (`Fira Code` + `Fira Sans`).

| Family | Role | Weights |
| --- | --- | --- |
| **Fira Sans** | UI text, headings, body | 400 / 500 / 600 / 700 |
| **Fira Code** | Data layer: model names, temperatures, tool tags, agent ids, timestamps, numbers | 400 / 500 / 600 |

Rule: if it is data, it is monospace. Everything else is Fira Sans. Headings are not over-weighted (600 max, tight tracking) — the console look comes from density and hairlines, not display type.

## Scale

| Scale | Value |
| --- | --- |
| Spacing base | 0.25rem (Tailwind `--spacing`) |
| Radius — fields/selectors | 0.5rem (`--radius-field`) |
| Radius — boxes/cards | 0.75rem (`--radius-box`) |
| Radius — chips/badges | full |
| Type scale | xs 0.75 / sm 0.875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875 rem |
| Row height | 44px rows in tables (`td py-3.5`), th = 12px semibold, 55% opacity |

## Motion

| Token | Duration | Purpose |
| --- | --- | --- |
| `lamp-pulse` | 1.6s | Live lamp glow (running) |
| `node-breathe` | 2.2s | Schematic node emphasis |
| `node-halo` | 1.8s | Ring pulse on active node |
| `track-flow` | 2s | Dashed route progression |
| `page-enter` | 0.22s | Page fade-up |

All motion respects `prefers-reduced-motion` (global kill switch + schematic interval pause).

## Stacking

| Utility | Value |
| --- | --- |
| `z-dropdown` | 1000 |
| `z-sticky` | 1100 (navbar) |
| `z-modal` | 1200 |
| `z-popover` | 1300 (toasts, menu popovers) |

## Theme mapping (daisyUI 5)

Themes: `light` (default) + `dark`. `--color-primary` = ink, `--color-primary-content` = white. Status hues are NOT wired into daisyUI semantic colors (`success`/`error`/`warning`/`info`) — statuses are expressed through the lamp components directly, keeping daisyUI's generic semantics unused and the palette honest.

## Dark mode

Toggle-driven via `data-theme` on `<html>` (persisted under `nexus-theme`; falls back to `prefers-color-scheme`; set pre-paint in `index.html` to avoid flash). In dark, the console tokens remap onto the control-room register so every `text-ink` / `bg-console` / `ring-line` utility adapts automatically:

| Token | Light | Dark |
| --- | --- | --- |
| `--color-ink` | `#141B26` | `#E8ECF3` |
| `--color-ink-muted` | `#5C6675` | `#93A0B3` |
| `--color-console` | `#EEF1F5` | `#10151F` |
| `--color-sheet` | `#FFFFFF` | `#171E2B` |
| `--color-line` | `#D8DEE7` | `#232C3D` |

Primary flips to a light chip (`#E8ECF3` with `#10151F` content) so buttons/logo stay readable; the `.panel` control room drops a step darker (`--panel #0B0F16`) to stay distinct from the dark canvas. Fills that must invert use theme-aware primitives (`bg-primary text-primary-content`) instead of hardcoded white-on-ink.
