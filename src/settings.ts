import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type MusePlugin from "./main";

export type Provider = "anthropic" | "openai";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

export interface MuseSettings {
  provider: Provider;
  apiKeySecretId: string;
  modelOverride: string;
  name: string;
  websiteUrl: string;
  githubUsername: string;
  bio: string;
  topics: string;
  additionalContext: string;
  outputFolder: string;
}

export const DEFAULT_SETTINGS: MuseSettings = {
  provider: "anthropic",
  apiKeySecretId: "",
  modelOverride: "",
  name: "",
  websiteUrl: "",
  githubUsername: "",
  bio: "",
  topics: "",
  additionalContext: "",
  outputFolder: "Muse",
};

export class MuseSettingTab extends PluginSettingTab {
  plugin: MusePlugin;

  constructor(app: App, plugin: MusePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("API").setHeading();

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Which AI service to use for generating prompts.")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(PROVIDER_LABELS)) {
          dropdown.addOption(value, label);
        }
        dropdown
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            this.plugin.settings.provider = value as Provider;
            await this.plugin.saveSettings();
            this.display(); // Re-render to update placeholders
          });
      });

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Your API key, stored securely in Obsidian's secret storage.")
      .addComponent((el) => {
        const secret = new SecretComponent(this.app, el);
        if (this.plugin.settings.apiKeySecretId) {
          secret.setValue(this.plugin.settings.apiKeySecretId);
        }
        secret.onChange(async (secretId) => {
          this.plugin.settings.apiKeySecretId = secretId;
          await this.plugin.saveSettings();
        });
        return secret;
      });

    const defaultModel =
      this.plugin.settings.provider === "anthropic"
        ? "claude-sonnet-4-6"
        : "gpt-4o";

    new Setting(containerEl)
      .setName("Model override")
      .setDesc("Leave empty to use the default model for your provider.")
      .addText((text) =>
        text
          .setPlaceholder(defaultModel)
          .setValue(this.plugin.settings.modelOverride)
          .onChange(async (value) => {
            this.plugin.settings.modelOverride = value;
            await this.plugin.saveSettings();
          })
      );

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
      .setName("GitHub username")
      .setDesc("Used to fetch your public repos for prompt context.")
      .addText((text) =>
        text
          .setPlaceholder("Username")
          .setValue(this.plugin.settings.githubUsername)
          .onChange(async (value) => {
            this.plugin.settings.githubUsername = value;
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
          .setPlaceholder("Rust, web dev, gardening")
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
          .setPlaceholder("Muse")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
