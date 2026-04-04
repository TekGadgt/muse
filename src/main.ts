import { Notice, Plugin, TFile, TFolder, normalizePath } from "obsidian";
import {
  ClaudeFocusSettings,
  ClaudeFocusSettingTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { fetchWritingPrompt } from "./api";
import { createZenNote } from "./file";
import { ZenWriterView, ZEN_VIEW_TYPE } from "./view";

export default class MusePlugin extends Plugin {
  settings: ClaudeFocusSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(ZEN_VIEW_TYPE, (leaf) => {
      return new ZenWriterView(leaf);
    });

    this.addCommand({
      id: "enter-muse-mode",
      name: "Enter muse mode",
      callback: () => this.activateMuseMode(),
    });

    this.addRibbonIcon("pencil", "Enter muse mode", () => {
      void this.activateMuseMode();
    });

    this.addSettingTab(new ClaudeFocusSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<ClaudeFocusSettings> | null
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async getPastPrompts(): Promise<string[]> {
    const folderPath = normalizePath(this.settings.outputFolder);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return [];

    const prompts: string[] = [];
    for (const child of folder.children) {
      if (!(child instanceof TFile) || child.extension !== "md") continue;
      const content = await this.app.vault.read(child);
      // Extract blockquoted prompt from the top of the file
      const promptLines: string[] = [];
      for (const line of content.split("\n")) {
        if (line.startsWith("> ")) {
          promptLines.push(line.substring(2));
        } else {
          break;
        }
      }
      if (promptLines.length > 0) {
        prompts.push(promptLines.join(" "));
      }
    }
    // Return the 10 most recent to keep context manageable
    return prompts.slice(-10);
  }

  private async activateMuseMode(): Promise<void> {
    if (!this.settings.apiKey) {
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Claude" and "API" are proper nouns
      new Notice("Please set your API key in settings.");
      return;
    }

    // Open the zen view first to show loading state
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: ZEN_VIEW_TYPE, active: true });

    const view = leaf.view;
    if (!(view instanceof ZenWriterView)) {
      new Notice("Failed to open muse view.");
      return;
    }

    try {
      const pastPrompts = await this.getPastPrompts();
      const prompt = await fetchWritingPrompt(this.settings, pastPrompts);
      const file = await createZenNote(
        this.app.vault,
        this.settings.outputFolder,
        prompt
      );
      const fileContent = await this.app.vault.read(file);
      view.setFile(file);
      view.renderWritingSurface(prompt, fileContent);
    } catch (error) {
      leaf.detach();
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("key")) {
          new Notice("Invalid API key. Check your settings.");
        } else if (error.message.includes("429")) {
          new Notice("Rate limited. Please try again in a moment.");
        } else {
          new Notice(error.message);
        }
      } else {
        new Notice("An unexpected error occurred.");
      }
    }
  }
}
