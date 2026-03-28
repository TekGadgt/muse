# obsidian-claude-focus — Design Spec

## Overview

A distraction-free writing plugin for Obsidian that generates personalized writing prompts via the Claude API. The user enters a full-screen zen mode, receives a writing prompt based on their configured profile, and writes in a clean, minimal environment. Works on desktop and mobile (including Android with physical keyboard).

## Plugin Name & ID

- **Display name:** Claude Focus
- **Plugin ID:** `obsidian-claude-focus`

## Settings

All settings stored via Obsidian's `plugin.saveData()` / `plugin.loadData()`.

### Fields

| Field | Type | Notes |
|---|---|---|
| Claude API Key | Password input | Required. Validated on save. |
| Name | Text input | User's name, used in system prompt |
| Website/Blog URL | Text input | Optional |
| GitHub/Portfolio URL | Text input | Optional |
| Bio/About | Small textarea | Short description of who they are |
| Topics of Interest | Text input | Comma-separated |
| Additional Context | Large textarea | Freeform — tone preferences, goals, etc. |
| Output Folder | Text input / folder picker | Defaults to `Claude Focus/` |

### System Prompt Assembly

Settings fields are assembled into a system prompt at call time. The user never sees or edits the raw prompt. Example assembled prompt:

```
You are a writing prompt generator. The writer's details:
Name: {name}
Website: {website}
GitHub: {github}
About: {bio}
Topics: {topics}
Additional context: {additional}

Generate a single, specific writing prompt that inspires them to write about their work, interests, or experiences. Keep it to 2-3 sentences. Be direct — no preamble.
```

Empty fields are omitted from the assembled prompt.

## Zen Mode Experience

### Entering Zen Mode

1. User triggers via command palette ("Claude Focus: Enter Zen Mode"), ribbon icon, or mobile toolbar button.
2. Plugin opens a full-screen custom `ItemView` that replaces the current workspace.
3. A loading state is displayed while the API call is in flight.
4. On success:
   - A new note is created in the configured output folder with a timestamped filename (e.g., `2026-03-28.md`). If a file with that name exists, append a counter: `2026-03-28-2.md`, `2026-03-28-3.md`, etc.
   - The Claude writing prompt is inserted at the top of the note as a Markdown blockquote.
   - The zen view displays the prompt at top and positions the cursor below it, ready to write.
5. On failure: a notice is shown with the error, zen mode is not entered.

### The Writing Surface

- **Full-screen takeover** — all Obsidian chrome (sidebar, ribbon, tabs, status bar) hidden.
- **Solid background color** — clean, neutral. Respects dark/light mode based on Obsidian's current mode.
- **Typography** — readable font, comfortable max line width (~65-75 characters), generous line height.
- **Plain text editing** — no live Markdown rendering. This is intentional: the focus is on getting words on the page, not formatting. Markdown is rendered normally when viewing the note after exiting.
- **No toolbar, no buttons** (except the mobile Done button — see below).

### Exiting Zen Mode

- **Desktop / physical keyboard:** Press Escape.
- **Mobile touch-only:** A small, subtle "Done" button in the top corner.
- Both methods close the zen view and return to the normal Obsidian workspace.
- No confirmation dialog. The note is already saved via Obsidian's file persistence.
- On desktop, both Escape and the Done button work.

## Claude API Integration

### Request Details

- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **HTTP method:** Direct HTTP via Obsidian's `requestUrl` (cross-platform, works on mobile)
- **Model:** `claude-haiku-4-5-20251001`
- **Max tokens:** 200
- **System prompt:** Assembled from settings (see above)
- **User message:** `"Give me a writing prompt."`

No SDK dependency. Direct HTTP keeps the plugin lightweight and avoids bundling issues.

### Error Handling

| Scenario | Behavior |
|---|---|
| Missing/invalid API key | Notice directing user to settings. Zen mode not entered. |
| Network failure | Notice with error message. Zen mode not entered. |
| Rate limit | Notice suggesting to try again. Zen mode not entered. |

All errors prevent entering zen mode — the user is never left in a blank zen screen with no prompt.

## Mobile Compatibility

### Target Device

Primary mobile use case: Android foldable (Pixel Fold Pro) with a connected physical keyboard, used as a portable writing tool.

### Approach

No platform-specific code branches. Mobile compatibility is achieved through:

- **`requestUrl`** — Obsidian's cross-platform HTTP wrapper instead of `fetch` or Node APIs.
- **Standard text input** — `textarea` or `contenteditable`, which mobile OS keyboards handle natively.
- **Physical keyboard support** — Escape key events are dispatched normally when a keyboard is connected to Android. The Escape listener works identically to desktop.
- **Done button** — fallback for touch-only use (no physical keyboard). Small, subtle, top corner. Visible on all platforms but primarily needed for mobile touch.
- **Ribbon icon** — works on mobile natively.
- **Mobile toolbar button** — registered via `addMobileToolbarAction`.
- **Relative font sizing** — text scales properly on smaller/larger screens including foldable displays.

## Entry Points

| Method | Platform | API |
|---|---|---|
| Command palette | All | `addCommand()` |
| Ribbon icon | All | `addRibbonIcon()` |
| Mobile toolbar button | Mobile | `addMobileToolbarAction()` if available in the API version; otherwise ribbon icon is sufficient |

## File Output

- **Location:** Configurable output folder, defaults to `Claude Focus/`.
- **Naming:** `YYYY-MM-DD.md`. Counter appended for same-day duplicates: `YYYY-MM-DD-2.md`.
- **Format:**
  ```markdown
  > {Claude's writing prompt here}

  {user's writing goes here}
  ```
- **Persistence:** Obsidian handles file saves automatically. No manual save action needed.

## Technology

- **Language:** TypeScript
- **Build:** Standard Obsidian plugin toolchain (esbuild)
- **Dependencies:** None beyond Obsidian's API
- **Obsidian API surface:** `Plugin`, `ItemView`, `PluginSettingTab`, `Setting`, `requestUrl`, `Notice`, `addCommand`, `addRibbonIcon`
