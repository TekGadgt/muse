import { ItemView, WorkspaceLeaf, TFile } from "obsidian";

export const ZEN_VIEW_TYPE = "muse-zen";
const ZEN_ACTIVE_CLASS = "muse-zen-active";

export class ZenWriterView extends ItemView {
  private file: TFile | null = null;
  private textareaEl: HTMLTextAreaElement | null = null;
  private saveInterval: number | null = null;
  private promptHeader: string = "";
  private lastSavedValue: string = "";

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return ZEN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Muse";
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- must be async to match ItemView.onOpen() signature, but implementation is purely synchronous
  async onOpen(): Promise<void> {
    document.body.addClass(ZEN_ACTIVE_CLASS);

    const container = this.containerEl;
    container.empty();
    container.addClass("muse-zen-container");

    // Loading state
    const loadingEl = container.createDiv({ cls: "muse-loading" });
    loadingEl.createEl("span", { text: "Fetching your writing prompt..." });
    loadingEl.setAttribute("role", "status");
    loadingEl.setAttribute("aria-live", "polite");
  }

  renderWritingSurface(prompt: string, promptHeader: string): void {
    this.promptHeader = promptHeader;

    const container = this.containerEl;
    container.empty();
    container.addClass("muse-zen-container");

    const wrapper = container.createDiv({ cls: "muse-wrapper" });

    // Done button (primarily for mobile touch-only, visible on all platforms)
    const doneBtn = wrapper.createEl("button", {
      cls: "muse-done-btn",
      attr: {
        "aria-label": "Exit zen mode",
        "type": "button",
      },
    });
    doneBtn.setText("Done");
    doneBtn.addEventListener("click", () => { void this.exitMuseMode(); });

    // Prompt display
    const promptEl = wrapper.createDiv({ cls: "muse-prompt" });
    promptEl.createEl("blockquote", { text: prompt });

    // Writing area
    const editorEl = wrapper.createDiv({ cls: "muse-editor" });
    this.textareaEl = editorEl.createEl("textarea", {
      cls: "muse-textarea",
      attr: {
        placeholder: "Start writing...",
        "aria-label": "Writing area",
      },
    });

    this.textareaEl.focus();

    // Auto-save every 2 seconds while typing
    this.saveInterval = window.setInterval(() => { void this.saveContent(); }, 2000);

    // Listen for Escape
    this.registerDomEvent(container, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        void this.exitMuseMode();
      }
    });
  }

  setFile(file: TFile): void {
    this.file = file;
  }

  private async saveContent(): Promise<void> {
    if (!this.file || !this.textareaEl) return;

    const currentValue = this.textareaEl.value;
    if (currentValue === this.lastSavedValue) return;

    const newContent = this.promptHeader + currentValue;
    await this.app.vault.process(this.file, () => newContent);
    this.lastSavedValue = currentValue;
  }

  private async exitMuseMode(): Promise<void> {
    await this.saveContent();
    if (this.saveInterval !== null) {
      window.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    document.body.removeClass(ZEN_ACTIVE_CLASS);
    this.leaf.detach();
  }

  async onClose(): Promise<void> {
    await this.saveContent();
    if (this.saveInterval !== null) {
      window.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    document.body.removeClass(ZEN_ACTIVE_CLASS);
  }
}
