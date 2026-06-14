import type { Skill, ConversationContext } from "./types.js";

interface ToolCallRecord {
  sequence: string[];
  count: number;
  lastSeen: number;
}

export class SkillCreator {
  private toolCallPatterns: Map<string, ToolCallRecord> = new Map();
  private skills: Map<string, Skill> = new Map();
  private storage: Array<{ key: string; value: string }> = [];

  /** Evaluate a conversation turn for learnable patterns */
  evaluate(ctx: ConversationContext): Skill | null {
    const toolCalls = ctx.messages
      .filter((m) => m.role === "assistant" && m.tool_calls?.length)
      .flatMap((m) => m.tool_calls ?? [])
      .map((tc) => tc.name);

    if (toolCalls.length < 2) return null;

    const key = toolCalls.join("→");
    const existing = this.toolCallPatterns.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.toolCallPatterns.set(key, { sequence: toolCalls, count: 1, lastSeen: Date.now() });
      return null;
    }

    // Auto-create skill when same sequence appears >= 3 times
    if (existing.count >= 3 && !this.skills.has(key)) {
      return this.createSkill(key, toolCalls);
    }

    return null;
  }

  private createSkill(key: string, toolSequence: string[]): Skill {
    const name = `auto_${toolSequence.join("_").toLowerCase().slice(0, 40)}`;
    const skill: Skill = {
      id: `skill_${Date.now()}`,
      name,
      description: `Auto-created skill: ${toolSequence.join(" → ")}`,
      trigger: toolSequence[0],
      instructions: `Execute these tools in sequence: ${toolSequence.join(", ")}`,
      version: 1,
      usageCount: 0,
      successRate: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      toolSequence,
    };

    this.skills.set(key, skill);
    this.persistSkill(skill);
    return skill;
  }

  /** Track usage of a skill and auto-refine */
  recordUsage(skillId: string, success: boolean): void {
    for (const [, skill] of this.skills) {
      if (skill.id === skillId) {
        skill.usageCount++;
        skill.successRate =
          (skill.successRate * (skill.usageCount - 1) + (success ? 1 : 0)) / skill.usageCount;
        skill.updatedAt = new Date();
        return;
      }
    }
  }

  /** List all created skills */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  private persistSkill(skill: Skill): void {
    this.storage.push({ key: skill.id, value: JSON.stringify(skill) });
  }
}
