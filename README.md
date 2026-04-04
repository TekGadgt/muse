# Muse

A distraction-free writing plugin for Obsidian that generates personalized blog post topics using AI. Enter writing mode, get a prompt based on your actual projects and interests, and start writing.

## Features

- **Full-screen writing mode** — hides all Obsidian UI, leaving just your prompt and a clean writing surface
- **Personalized prompts** — pulls your real GitHub repositories and combines them with your profile to suggest specific, concrete blog post topics
- **No repeats** — remembers your recent prompts and asks for something different each time
- **Multi-provider** — works with Anthropic (Claude) or OpenAI (GPT), your choice
- **Works on mobile** — designed for desktop and mobile Obsidian, including Android with physical keyboards

## Setup

1. Install the plugin and enable it
2. Open Settings > Muse
3. Choose your AI provider (Anthropic or OpenAI)
4. Enter your API key ([Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys))
5. Optionally set a model override (defaults to Claude Sonnet for Anthropic, GPT-4o for OpenAI)
6. Fill in your profile — name, website, GitHub URL, bio, topics of interest, and any additional context
7. Set an output folder (defaults to `Muse/`)

## Usage

Enter writing mode via:
- **Command palette** — search "Muse: Enter writing mode"
- **Ribbon icon** — click the pencil icon in the left sidebar

A writing prompt appears at the top. Write below it. Your work is auto-saved every few seconds.

Exit by pressing **Escape** (or tapping **Done** on mobile touch).

Each session creates a new date-stamped note in your output folder (e.g., `2026-04-04.md`). The prompt is preserved as a blockquote at the top of the note.

## How it works

When you enter writing mode, the plugin:

1. Fetches your public GitHub repos for real project context
2. Reads recent prompts from your output folder to avoid repeats
3. Sends your profile + repo list + past prompts to your chosen AI provider to generate a blog post topic
4. Creates a new note with the prompt and opens the writing surface

## API usage

Each session makes:
- 1 request to the GitHub API (public, no auth needed)
- 1 request to your chosen AI provider (uses your API key, billed to your account)

The plugin uses a 300 token max per prompt, so each session costs fractions of a cent.

## Requirements

- An API key from [Anthropic](https://console.anthropic.com/settings/keys) or [OpenAI](https://platform.openai.com/api-keys)
- Obsidian 1.0.0+
