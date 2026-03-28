# Claude Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Obsidian plugin that opens a distraction-free writing view powered by Claude-generated writing prompts.

**Architecture:** Custom `ItemView` for the zen writing surface, `PluginSettingTab` for configuration, direct HTTP via `requestUrl` for Claude API calls. All styling via `styles.css` using Obsidian CSS variables. No external dependencies.

**Tech Stack:** TypeScript, Obsidian API, esbuild, Claude Messages API (Haiku)

---

## File Structure

```
obsidian-claude-focus/
├── manifest.json          # Plugin metadata
├── package.json           # Node project config
├── tsconfig.json          # TypeScript config
├── esbuild.config.mjs     # Build script
├── .eslintrc.mjs          # ESLint with obsidianmd plugin
├── styles.css             # All plugin styles
├── LICENSE                # MIT license
├── src/
│   ├── main.ts            # Plugin entry — registers view, commands, ribbon, settings tab
│   ├── settings.ts        # Settings tab + settings interface/defaults
│   ├── api.ts             # Claude API call (requestUrl + prompt assembly)
│   ├── view.ts            # ZenWriterView (ItemView) — the writing surface
│   └── file.ts            # Note creation — folder check, filename generation, prompt insertion
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `LICENSE`

- [ ] **Step 1: Create manifest.json**

```json
{
  "id": "claude-focus",
  "name": "Claude Focus",
  "version": "0.1.0",
  "minAppVersion": "1.0.0",
  "description": "Distraction-free writing with AI-generated prompts powered by Claude.",
  "author": "tekgadgt",
  "isDesktopOnly": false
}
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "obsidian-claude-focus",
  "version": "0.1.0",
  "description": "Distraction-free writing with AI-generated prompts powered by Claude.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "lint": "npx eslint src/"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "esbuild": "^0.21.0",
    "obsidian": "latest",
    "typescript": "^5.4.0",
    "eslint": "^9.0.0",
    "eslint-plugin-obsidianmd": "^0.1.9"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES6",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES5", "ES6", "ES7"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create esbuild.config.mjs**

```javascript
import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 5: Create LICENSE**

Create an MIT license file with copyright holder "tekgadgt" and year 2026.

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add manifest.json package.json tsconfig.json esbuild.config.mjs LICENSE package-lock.json
git commit -m "feat: scaffold obsidian-claude-focus plugin project"
```

---

### Task 2: Settings interface and defaults

**Files:**
- Create: `src/settings.ts`

- [ ] **Step 1: Create src/settings.ts with interface, defaults, and settings tab**

```typescript
import { App, PluginSettingTab, Setting } from "obsidian";
import type ClaudeFocusPlugin from "./main";

export interface ClaudeFocusSettings {
  apiKey: string;
  name: string;
  websiteUrl: string;
  githubUrl: string;
  bio: string;
  topics: string;
  additionalContext: string;
  outputFolder: string;
}

export const DEFAULT_SETTINGS: ClaudeFocusSettings = {
  apiKey: "",
  name: "",
  websiteUrl: "",
  githubUrl: "",
  bio: "",
  topics: "",
  additionalContext: "",
  outputFolder: "Claude Focus",
};

export class ClaudeFocusSettingTab extends PluginSettingTab {
  plugin: ClaudeFocusPlugin;

  constructor(app: App, plugin: ClaudeFocusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("API").setHeading();

    new Setting(containerEl)
      .setName("Claude API key")
      .setDesc("Your Anthropic API key. Stored locally in plugin data.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Profile").setHeading();

    new Setting(containerEl)
      .setName("Name")
      .setDesc("Your name, so prompts can address you personally.")
      .addText((text) =>
        text
          .setPlaceholder("Jane")
          .setValue(this.plugin.settings.name)
          .onChange(async (value) => {
            this.plugin.settings.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Website / blog URL")
      .addText((text) =>
        text
          .setPlaceholder("https://example.com")
          .setValue(this.plugin.settings.websiteUrl)
          .onChange(async (value) => {
            this.plugin.settings.websiteUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("GitHub / portfolio URL")
      .addText((text) =>
        text
          .setPlaceholder("https://github.com/username")
          .setValue(this.plugin.settings.githubUrl)
          .onChange(async (value) => {
            this.plugin.settings.githubUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Bio / about")
      .setDesc("A short description of who you are and what you do.")
      .addTextArea((text) =>
        text
          .setPlaceholder("I'm a software engineer who...")
          .setValue(this.plugin.settings.bio)
          .onChange(async (value) => {
            this.plugin.settings.bio = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Topics of interest")
      .setDesc("Comma-separated list of topics you write about.")
      .addText((text) =>
        text
          .setPlaceholder("rust, web dev, gardening")
          .setValue(this.plugin.settings.topics)
          .onChange(async (value) => {
            this.plugin.settings.topics = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Additional context")
      .setDesc(
        "Anything else — tone preferences, goals, what you want to write about."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("I want to write more casually about my projects...")
          .setValue(this.plugin.settings.additionalContext)
          .onChange(async (value) => {
            this.plugin.settings.additionalContext = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Output").setHeading();

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Folder where new writing notes are created.")
      .addText((text) =>
        text
          .setPlaceholder("Claude Focus")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
```

- [ ] **Step 2: Verify it compiles**

Create a minimal `src/main.ts` stub so TypeScript can resolve the import:

```typescript
import { Plugin } from "obsidian";
import { ClaudeFocusSettings, DEFAULT_SETTINGS } from "./settings";

export default class ClaudeFocusPlugin extends Plugin {
  settings: ClaudeFocusSettings = DEFAULT_SETTINGS;

  async onload() {}

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/settings.ts src/main.ts
git commit -m "feat: add settings interface, defaults, and settings tab"
```

---

### Task 3: Claude API integration

**Files:**
- Create: `src/api.ts`

- [ ] **Step 1: Create src/api.ts**

```typescript
import { requestUrl } from "obsidian";
import type { ClaudeFocusSettings } from "./settings";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;

export function buildSystemPrompt(settings: ClaudeFocusSettings): string {
  const lines: string[] = [
    "You are a writing prompt generator. The writer's details:",
  ];

  if (settings.name) lines.push(`Name: ${settings.name}`);
  if (settings.websiteUrl) lines.push(`Website: ${settings.websiteUrl}`);
  if (settings.githubUrl) lines.push(`GitHub: ${settings.githubUrl}`);
  if (settings.bio) lines.push(`About: ${settings.bio}`);
  if (settings.topics) lines.push(`Topics: ${settings.topics}`);
  if (settings.additionalContext)
    lines.push(`Additional context: ${settings.additionalContext}`);

  lines.push("");
  lines.push(
    "Generate a single, specific writing prompt that inspires them to write about their work, interests, or experiences. Keep it to 2-3 sentences. Be direct — no preamble."
  );

  return lines.join("\n");
}

export async function fetchWritingPrompt(
  settings: ClaudeFocusSettings
): Promise<string> {
  const response = await requestUrl({
    url: CLAUDE_API_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(settings),
      messages: [{ role: "user", content: "Give me a writing prompt." }],
    }),
  });

  if (response.status !== 200) {
    const errorBody = response.json;
    const message =
      errorBody?.error?.message ?? `API returned status ${response.status}`;
    throw new Error(message);
  }

  const body = response.json;
  const textBlock = body.content?.find(
    (block: { type: string }) => block.type === "text"
  );
  if (!textBlock?.text) {
    throw new Error("No text in Claude response.");
  }

  return textBlock.text;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/api.ts
git commit -m "feat: add Claude API integration with system prompt assembly"
```

---

### Task 4: File creation helper

**Files:**
- Create: `src/file.ts`

- [ ] **Step 1: Create src/file.ts**

```typescript
import { normalizePath, TFile, TFolder, Vault } from "obsidian";

function todayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath);
  const existing = vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFolder) return;
  await vault.createFolder(normalized);
}

function findAvailablePath(vault: Vault, folder: string, date: string): string {
  const basePath = normalizePath(`${folder}/${date}.md`);
  const existing = vault.getAbstractFileByPath(basePath);
  if (!existing) return basePath;

  let counter = 2;
  while (true) {
    const candidate = normalizePath(`${folder}/${date}-${counter}.md`);
    if (!vault.getAbstractFileByPath(candidate)) return candidate;
    counter++;
  }
}

export async function createZenNote(
  vault: Vault,
  outputFolder: string,
  prompt: string
): Promise<TFile> {
  await ensureFolder(vault, outputFolder);
  const date = todayString();
  const filePath = findAvailablePath(vault, outputFolder, date);
  const content = `> ${prompt}\n\n`;
  return await vault.create(filePath, content);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/file.ts
git commit -m "feat: add zen note file creation with date-based naming"
```

---

### Task 5: Zen writer view

**Files:**
- Create: `src/view.ts`

- [ ] **Step 1: Create src/view.ts**

```typescript
import { ItemView, WorkspaceLeaf, TFile } from "obsidian";

export const ZEN_VIEW_TYPE = "claude-focus-zen";

export class ZenWriterView extends ItemView {
  private file: TFile | null = null;
  private textareaEl: HTMLTextAreaElement | null = null;
  private saveInterval: number | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return ZEN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Claude Focus";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl;
    container.empty();
    container.addClass("claude-focus-zen-container");

    // Loading state
    const loadingEl = container.createDiv({ cls: "claude-focus-loading" });
    loadingEl.createEl("span", { text: "Fetching your writing prompt..." });
    loadingEl.setAttribute("role", "status");
    loadingEl.setAttribute("aria-live", "polite");
  }

  renderWritingSurface(prompt: string): void {
    const container = this.containerEl;
    container.empty();
    container.addClass("claude-focus-zen-container");

    const wrapper = container.createDiv({ cls: "claude-focus-wrapper" });

    // Done button (primarily for mobile touch-only, visible on all platforms)
    const doneBtn = wrapper.createEl("button", {
      cls: "claude-focus-done-btn",
      attr: {
        "aria-label": "Exit zen mode",
        "type": "button",
      },
    });
    doneBtn.setText("Done");
    doneBtn.addEventListener("click", () => this.exitZenMode());

    // Prompt display
    const promptEl = wrapper.createDiv({ cls: "claude-focus-prompt" });
    promptEl.createEl("blockquote", { text: prompt });

    // Writing area
    const editorEl = wrapper.createDiv({ cls: "claude-focus-editor" });
    this.textareaEl = editorEl.createEl("textarea", {
      cls: "claude-focus-textarea",
      attr: {
        placeholder: "Start writing...",
        "aria-label": "Writing area",
      },
    });

    this.textareaEl.focus();

    // Auto-save every 2 seconds while typing
    this.saveInterval = window.setInterval(() => this.saveContent(), 2000);

    // Listen for Escape
    this.registerDomEvent(container, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.exitZenMode();
      }
    });
  }

  setFile(file: TFile): void {
    this.file = file;
  }

  private async saveContent(): Promise<void> {
    if (!this.file || !this.textareaEl) return;

    const existingContent = await this.app.vault.read(this.file);
    // The file starts with "> prompt\n\n", we append user text after that
    const promptEnd = existingContent.indexOf("\n\n");
    const promptSection =
      promptEnd >= 0
        ? existingContent.substring(0, promptEnd + 2)
        : existingContent;
    const newContent = promptSection + this.textareaEl.value;

    await this.app.vault.modify(this.file, newContent);
  }

  private async exitZenMode(): Promise<void> {
    await this.saveContent();
    if (this.saveInterval !== null) {
      window.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    // Close this leaf to return to normal workspace
    this.leaf.detach();
  }

  async onClose(): Promise<void> {
    await this.saveContent();
    if (this.saveInterval !== null) {
      window.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/view.ts
git commit -m "feat: add ZenWriterView with full-screen writing surface"
```

---

### Task 6: Plugin main entry point

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace src/main.ts with the full plugin**

```typescript
import { Notice, Plugin } from "obsidian";
import {
  ClaudeFocusSettings,
  ClaudeFocusSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { fetchWritingPrompt } from "./api";
import { createZenNote } from "./file";
import { ZenWriterView, ZEN_VIEW_TYPE } from "./view";

export default class ClaudeFocusPlugin extends Plugin {
  settings: ClaudeFocusSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(ZEN_VIEW_TYPE, (leaf) => {
      return new ZenWriterView(leaf);
    });

    this.addCommand({
      id: "enter-zen-mode",
      name: "Enter zen mode",
      callback: () => this.activateZenMode(),
    });

    this.addRibbonIcon("pencil", "Claude Focus: Enter zen mode", () => {
      this.activateZenMode();
    });

    this.addSettingTab(new ClaudeFocusSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async activateZenMode(): Promise<void> {
    if (!this.settings.apiKey) {
      new Notice("Claude Focus: Please set your API key in settings.");
      return;
    }

    // Open the zen view first to show loading state
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: ZEN_VIEW_TYPE, active: true });

    const view = leaf.view;
    if (!(view instanceof ZenWriterView)) {
      new Notice("Claude Focus: Failed to open zen view.");
      return;
    }

    try {
      const prompt = await fetchWritingPrompt(this.settings);
      const file = await createZenNote(
        this.app.vault,
        this.settings.outputFolder,
        prompt
      );
      view.setFile(file);
      view.renderWritingSurface(prompt);
    } catch (error) {
      leaf.detach();
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("key")) {
          new Notice(
            "Claude Focus: Invalid API key. Check your settings."
          );
        } else if (error.message.includes("429")) {
          new Notice(
            "Claude Focus: Rate limited. Please try again in a moment."
          );
        } else {
          new Notice(`Claude Focus: ${error.message}`);
        }
      } else {
        new Notice("Claude Focus: An unexpected error occurred.");
      }
    }
  }
}
```

- [ ] **Step 2: Build the plugin**

Run: `npm run build`
Expected: `main.js` is created in the project root with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up plugin entry point with command, ribbon, and zen mode activation"
```

---

### Task 7: Styles

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Create styles.css**

```css
/* Zen container — full screen takeover */
.claude-focus-zen-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: var(--background-primary);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
}

/* Centered content wrapper */
.claude-focus-wrapper {
  position: relative;
  width: 100%;
  max-width: 42rem;
  padding: var(--size-4-8) var(--size-4-4);
  box-sizing: border-box;
}

/* Done button — subtle, top-right */
.claude-focus-done-btn {
  position: fixed;
  top: var(--size-4-4);
  right: var(--size-4-4);
  background: transparent;
  color: var(--text-faint);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  padding: var(--size-4-1) var(--size-4-3);
  font-size: var(--font-ui-small);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.claude-focus-done-btn:hover {
  color: var(--text-muted);
  border-color: var(--background-modifier-border-hover);
}

.claude-focus-done-btn:focus-visible {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
}

/* Prompt blockquote */
.claude-focus-prompt {
  margin-bottom: var(--size-4-8);
}

.claude-focus-prompt blockquote {
  border-left: 3px solid var(--text-faint);
  padding-left: var(--size-4-4);
  color: var(--text-muted);
  font-size: var(--font-ui-medium);
  line-height: 1.7;
  margin: 0;
  font-style: italic;
}

/* Writing area */
.claude-focus-editor {
  width: 100%;
}

.claude-focus-textarea {
  width: 100%;
  min-height: 60vh;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-normal);
  font-family: var(--font-text-theme);
  font-size: 1.1rem;
  line-height: 1.8;
  resize: none;
  padding: 0;
}

.claude-focus-textarea::placeholder {
  color: var(--text-faint);
}

.claude-focus-textarea:focus-visible {
  outline: none;
}

/* Loading state */
.claude-focus-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
  color: var(--text-muted);
  font-size: var(--font-ui-medium);
}
```

- [ ] **Step 2: Build and verify styles are picked up**

Run: `npm run build`
Expected: `main.js` built. `styles.css` exists alongside it (Obsidian loads it automatically).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add zen mode styles with full-screen takeover and clean typography"
```

---

### Task 8: Manual testing in Obsidian

**Files:**
- No code changes — testing only.

- [ ] **Step 1: Symlink or copy plugin into a test vault**

```bash
# Create a test vault plugins directory if needed
mkdir -p ~/obsidian-test-vault/.obsidian/plugins/claude-focus

# Symlink the built files
ln -sf "$(pwd)/main.js" ~/obsidian-test-vault/.obsidian/plugins/claude-focus/main.js
ln -sf "$(pwd)/styles.css" ~/obsidian-test-vault/.obsidian/plugins/claude-focus/styles.css
ln -sf "$(pwd)/manifest.json" ~/obsidian-test-vault/.obsidian/plugins/claude-focus/manifest.json
```

- [ ] **Step 2: Test settings tab**

1. Open Obsidian with test vault
2. Enable "Claude Focus" in Settings > Community Plugins
3. Open Claude Focus settings
4. Verify all fields are present: API key (password field), Name, Website, GitHub, Bio, Topics, Additional context, Output folder
5. Enter your API key and a few profile fields
6. Close and reopen settings — verify values persisted

- [ ] **Step 3: Test zen mode activation**

1. Open command palette (Cmd/Ctrl+P)
2. Search for "Claude Focus: Enter zen mode"
3. Verify loading state appears
4. Verify prompt appears as a blockquote at the top
5. Verify a new note was created in the configured output folder with today's date
6. Type some text — verify it appears
7. Press Escape — verify you return to normal Obsidian
8. Open the created note — verify it contains the prompt as a blockquote and your text below

- [ ] **Step 4: Test ribbon icon**

1. Click the pencil icon in the ribbon
2. Verify zen mode activates the same as via command palette

- [ ] **Step 5: Test error handling**

1. Remove the API key from settings
2. Try to enter zen mode — verify a notice appears telling you to set the key
3. Set an invalid API key
4. Try to enter zen mode — verify a notice appears about invalid key
5. Verify you're never left in a blank zen screen

- [ ] **Step 6: Test same-day duplicates**

1. Enter and exit zen mode twice on the same day
2. Verify files are named `YYYY-MM-DD.md` and `YYYY-MM-DD-2.md`

- [ ] **Step 7: Test on mobile (if available)**

1. Copy/sync plugin files to mobile vault
2. Verify ribbon icon is visible
3. Tap ribbon icon — verify zen mode works
4. Verify "Done" button is visible and exits zen mode
5. If using physical keyboard, verify Escape key works

---

### Task 9: ESLint setup and validation

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Create eslint.config.mjs**

```javascript
import obsidianmd from "eslint-plugin-obsidianmd";

export default [...obsidianmd.configs.recommended];
```

- [ ] **Step 2: Run ESLint**

Run: `npx eslint src/`
Expected: No errors. If there are warnings, review each one and fix if applicable.

- [ ] **Step 3: Fix any issues found**

Address any ESLint errors or warnings. Common things to check:
- Sentence case in all `.setName()`, `.setDesc()`, `.setText()` calls
- No plugin name in command names
- No "command" in command IDs
- No default hotkeys
- Using `requestUrl` not `fetch`
- Settings headings use `.setHeading()` not manual HTML

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "feat: add ESLint config with obsidianmd plugin rules"
```

---

### Task 10: Final build and submission readiness

**Files:**
- No new files — validation only.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: `main.js` created with no errors, no sourcemaps.

- [ ] **Step 2: Validate manifest**

Check `manifest.json`:
- `id` does not contain "obsidian" or end with "plugin" ✓
- `name` does not contain "Obsidian" or end with "Plugin" ✓
- `description` ends with punctuation ✓
- `description` does not contain "Obsidian" or "This plugin" ✓
- `isDesktopOnly` is `false` ✓

- [ ] **Step 3: Verify required files exist**

```bash
ls manifest.json main.js styles.css LICENSE
```

Expected: All four files present.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production build and submission readiness check"
```
