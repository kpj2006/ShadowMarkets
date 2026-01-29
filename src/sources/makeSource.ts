import type { Env } from "../util/env.js";
import type { EventSource } from "./eventSource.js";
import { GithubPrivateSource } from "./githubPrivateSource.js";
import { LocalPrivateSource } from "./localPrivateSource.js";

export function makeEventSource(env: Env): EventSource {
  if (env.github) return new GithubPrivateSource(env.github);
  return new LocalPrivateSource(env.privateEventJsonPath);
}

