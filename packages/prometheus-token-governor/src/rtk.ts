import type { ProcessRequest } from "./types.js";

interface CacheEntry {
  hash: string;
  content: string;
}

export class RTKCompressor {
  private maxTokensPerToolResult: number;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheHits = 0;

  constructor(maxTokensPerToolResult = 800) {
    this.maxTokensPerToolResult = maxTokensPerToolResult;
  }

  /** Compress a request to minimize token usage */
  compress(req: ProcessRequest): { messages: Array<{ role: string; content: string }> } {
    const compressed = req.messages.map((msg) => {
      if (msg.role !== "tool") return msg;
      return { ...msg, content: this.compressToolResult(msg.content) };
    });

    return { messages: compressed };
  }

  /** Compress a single tool result string */
  private compressToolResult(content: string): string {
    // Check cache first
    const hash = this.simpleHash(content.slice(0, 100));
    const cached = this.cache.get(hash);
    if (cached && cached.content === content) {
      this.cacheHits++;
      return `[CACHED — ${this.estimateTokens(content)} tokens saved]`;
    }

    // Store in cache
    this.cache.set(hash, { hash, content });
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    let result = content;

    // Trim lines: keep first N/2 + last 10
    const lines = result.split("\n");
    if (lines.length > this.maxTokensPerToolResult / 10) {
      const head = lines.slice(0, Math.floor(this.maxTokensPerToolResult / 20));
      const tail = lines.slice(-10);
      result = [
        ...head,
        `[… ${lines.length - head.length - tail.length} lines truncated …]`,
        ...tail,
      ].join("\n");
    }

    // Compress stack traces
    result = result.replace(
      /(Error: .+?)\n(\s+at .+\n){3,}/gs,
      "$1\n  [… stack trace truncated …]\n",
    );

    // Compress large JSON arrays
    result = result.replace(
      /(\[[\s\S]*?)((?:,\s*\{[^}]*\}){10,})([\s\S]*?\])/g,
      (_, start, _middle, end) =>
        `${start.slice(0, 200)} [… array truncated: too many items …]${end.slice(-100)}`,
    );

    // Token limit enforcement
    const estimatedTokens = this.estimateTokens(result);
    if (estimatedTokens > this.maxTokensPerToolResult) {
      result = result.slice(0, this.maxTokensPerToolResult * 4);
      result += `\n[… truncated at ${this.maxTokensPerToolResult} estimated tokens …]`;
    }

    return result;
  }

  /** Simple token estimator */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  get cacheHitRate(): number {
    return this.cache.size > 0 ? this.cacheHits / this.cache.size : 0;
  }
}
