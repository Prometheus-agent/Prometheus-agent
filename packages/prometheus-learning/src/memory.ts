import Database from "better-sqlite3";
import type { MemoryEntry, ConversationContext } from "./types.js";

const SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  session_id, role, content, summary, user_id, channel,
  content='memory'
);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT DEFAULT '',
  timestamp INTEGER NOT NULL,
  user_id TEXT,
  channel TEXT
);
`;

export class MemoryStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  /** Store a conversation turn in memory */
  store(ctx: ConversationContext): void {
    const now = Date.now();
    const sessionId = ctx.sessionId ?? `session_${now}`;
    const insertMemory = this.db.prepare(
      `INSERT OR REPLACE INTO memory (id, session_id, role, content, summary, timestamp, user_id, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertFts = this.db.prepare(
      `INSERT INTO memory_fts (rowid, session_id, role, content, summary, user_id, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    const tx = this.db.transaction(() => {
      for (const msg of ctx.messages) {
        const id = `${sessionId}_${now}_${Math.random().toString(36).slice(2, 8)}`;
        const summary = msg.content.slice(0, 200);
        const result = insertMemory.run(
          id,
          sessionId,
          msg.role,
          msg.content,
          summary,
          now,
          ctx.userId ?? null,
          ctx.channel ?? null,
        );
        insertFts.run(
          result.lastInsertRowid,
          sessionId,
          msg.role,
          msg.content,
          summary,
          ctx.userId ?? null,
          ctx.channel ?? null,
        );
      }
    });
    tx();
  }

  /** Full-text search across memory */
  search(query: string, limit = 10): MemoryEntry[] {
    const safeQuery = query.replace(/[^a-zA-Z0-9_\-*]/g, " ").trim();
    if (!safeQuery) return [];

    const rows = this.db
      .prepare(`
      SELECT m.* FROM memory m
      JOIN memory_fts fts ON m.rowid = fts.rowid
      WHERE memory_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
      .all(safeQuery, limit) as MemoryEntry[];
    return rows;
  }

  /** Get only relevant context from memory (compress full history) */
  compressContext(query: string, maxTokens = 2000): MemoryEntry[] {
    const results = this.search(query, 20);
    let totalChars = 0;
    const tokenBudget = maxTokens * 4; // approximate
    const compressed: MemoryEntry[] = [];

    for (const r of results) {
      if (totalChars >= tokenBudget) break;
      r.content = r.content.slice(0, 500);
      totalChars += r.content.length;
      compressed.push(r);
    }
    return compressed;
  }

  /** Recent context for warm-start */
  getRecent(limit = 50): MemoryEntry[] {
    return this.db
      .prepare("SELECT * FROM memory ORDER BY timestamp DESC LIMIT ?")
      .all(limit) as MemoryEntry[];
  }

  close(): void {
    this.db.close();
  }
}
