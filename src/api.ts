import { requestUrl } from "obsidian";
import type { ClaudeFocusSettings } from "./settings";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 300;

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  topics?: string[];
}

function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+)/);
  return match ? match[1] : null;
}

async function fetchGitHubRepos(
  githubUrl: string
): Promise<string> {
  const username = extractGitHubUsername(githubUrl);
  if (!username) return "";

  try {
    const response = await requestUrl({
      url: `https://api.github.com/users/${username}/repos?sort=updated&per_page=20`,
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (response.status !== 200) return "";

    const repos = response.json as GitHubRepo[];
    const owned = repos.filter((r) => !r.fork);
    if (owned.length === 0) return "";

    const repoList = owned
      .map((r) => {
        const parts = [r.name];
        if (r.description) parts.push(`— ${r.description}`);
        if (r.language) parts.push(`(${r.language})`);
        return parts.join(" ");
      })
      .join("\n");

    return `\nRecent GitHub repositories:\n${repoList}`;
  } catch {
    return "";
  }
}

export async function buildSystemPrompt(
  settings: ClaudeFocusSettings
): Promise<string> {
  const lines: string[] = [
    "You generate blog post topic ideas for a writer. Your job is to suggest a specific, concrete topic they could write a blog post about — not an introspective question or interview prompt.",
    "",
    "The writer's details:",
  ];

  if (settings.name) lines.push(`Name: ${settings.name}`);
  if (settings.websiteUrl) lines.push(`Website: ${settings.websiteUrl}`);
  if (settings.githubUrl) lines.push(`GitHub: ${settings.githubUrl}`);
  if (settings.bio) lines.push(`About: ${settings.bio}`);
  if (settings.topics) lines.push(`Topics: ${settings.topics}`);
  if (settings.additionalContext)
    lines.push(`Additional context: ${settings.additionalContext}`);

  if (settings.githubUrl) {
    const repoContext = await fetchGitHubRepos(settings.githubUrl);
    if (repoContext) lines.push(repoContext);
  }

  lines.push("");
  lines.push(
    "Based on their ACTUAL projects, tools, and interests listed above, suggest a specific blog post topic. Reference real project names and technologies from their GitHub repos when possible. Think \"how I built X\", \"why Y works better than Z\", \"a beginner's guide to W\", \"what I learned from doing Q\". Give the topic in 1-2 sentences. Be direct, no preamble, no questions directed at the writer. Do not invent or assume projects they haven't built."
  );

  return lines.join("\n");
}

export async function fetchWritingPrompt(
  settings: ClaudeFocusSettings,
  pastPrompts: string[]
): Promise<string> {
  let userMessage = "Give me a writing prompt.";
  if (pastPrompts.length > 0) {
    userMessage += "\n\nDo NOT repeat or rephrase any of these previous prompts — pick a completely different project or topic:\n";
    userMessage += pastPrompts.map((p) => `- ${p}`).join("\n");
  }

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
      system: await buildSystemPrompt(settings),
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (response.status !== 200) {
    const errorBody = response.json as { error?: { message?: string } };
    const message =
      errorBody?.error?.message ?? `API returned status ${response.status}`;
    throw new Error(message);
  }

  const body = response.json as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = body.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("No text in Claude response.");
  }

  return textBlock.text;
}
