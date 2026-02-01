import type { Env } from "../util/env.js";
import type { EventSource } from "./eventSource.js";
import { GithubPrivateSource } from "./githubPrivateSource.js";
import { LocalPrivateSource } from "./localPrivateSource.js";
import { DiscordPrivateSource } from "./discordPrivateSource.js";

export function makeEventSource(env: Env): EventSource {
  if (env.discord) return new DiscordPrivateSource(env.discord);
  if (env.github) return new GithubPrivateSource(env.github);
  return new LocalPrivateSource(env.privateEventJsonPath);
}

