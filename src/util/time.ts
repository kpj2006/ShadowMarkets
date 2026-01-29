export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sleepSeconds(s: number): Promise<void> {
  return sleepMs(s * 1000);
}

