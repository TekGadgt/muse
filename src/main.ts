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
