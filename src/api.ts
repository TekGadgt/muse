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
