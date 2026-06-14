import type { UserProfile, UserPreferences, ConversationContext } from "./types.js";

export class UserProfiler {
  private profiles: Map<string, UserProfile> = new Map();

  /** Extract and learn user preferences from messages */
  learn(ctx: ConversationContext): void {
    if (!ctx.userId) return;

    let profile = this.profiles.get(ctx.userId);
    if (!profile) {
      profile = {
        userId: ctx.userId,
        preferences: {},
        topics: [],
        activeHours: new Map(),
        channels: [],
        totalInteractions: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
      };
      this.profiles.set(ctx.userId, profile);
    }

    profile.lastSeen = new Date();
    profile.totalInteractions++;

    // Track channel
    if (ctx.channel && !profile.channels.includes(ctx.channel)) {
      profile.channels.push(ctx.channel);
    }

    // Track active hours
    const hour = new Date().getHours().toString();
    profile.activeHours.set(hour, (profile.activeHours.get(hour) ?? 0) + 1);

    // Analyze user messages for preferences
    const userMessages = ctx.messages.filter((m) => m.role === "user");
    for (const msg of userMessages) {
      this.analyzeMessage(msg.content, profile);
    }
  }

  private analyzeMessage(content: string, profile: UserProfile): void {
    const lower = content.toLowerCase();

    // Detect language preference (basic heuristic)
    if (/你好|谢谢/.test(content)) profile.preferences.language = "zh";
    else if (/hola|gracias/.test(content)) profile.preferences.language = "es";
    else if (/bonjour|merci/.test(content)) profile.preferences.language = "fr";

    // Detect formality
    if (/\b(please|would you|could you|kindly)\b/i.test(content)) {
      profile.preferences.formality = "formal";
    } else if (/^(yo|hey|sup|hiya)\b/i.test(content)) {
      profile.preferences.formality = "casual";
    }

    // Detect conciseness preference
    if (content.length < 50 && !content.includes("?")) {
      profile.preferences.conciseness = "brief";
    } else if (content.length > 500) {
      profile.preferences.conciseness = "detailed";
    }

    // Extract topics (simple keyword matching)
    const topicKeywords = [
      "code",
      "programming",
      "javascript",
      "python",
      "rust",
      "testing",
      "deploy",
      "api",
      "database",
      "security",
      "design",
      "ui",
      "ux",
      "frontend",
      "backend",
      "math",
      "science",
      "physics",
      "data",
    ];
    for (const keyword of topicKeywords) {
      if (lower.includes(keyword) && !profile.topics.includes(keyword)) {
        profile.topics.push(keyword);
      }
    }
  }

  /** Get current profile for a user */
  getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  /** Generate system prompt snippet about user preferences */
  buildUserContext(userId: string): string {
    const profile = this.profiles.get(userId);
    if (!profile) return "";

    const parts: string[] = [];
    const prefs = profile.preferences;

    if (prefs.language) parts.push(`Preferred language: ${prefs.language}`);
    if (prefs.formality) parts.push(`Formality level: ${prefs.formality}`);
    if (prefs.conciseness) parts.push(`Response style: ${prefs.conciseness}`);
    if (profile.topics.length > 0) parts.push(`Known topics: ${profile.topics.join(", ")}`);

    return parts.length > 0 ? `[User context: ${parts.join(" | ")}]` : "";
  }
}
