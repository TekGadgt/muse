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
