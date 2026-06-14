import os from "node:os";
import path from "node:path";
import { MemoryStore } from "./memory.js";
import { SkillCreator } from "./skill-creator.js";
import { TrajectoryRecorder } from "./trajectory.js";
import type { ConversationContext, Skill } from "./types.js";
import { UserProfiler } from "./user-profile.js";

export class LearningSystem {
  public memory: MemoryStore;
  public skillCreator: SkillCreator;
  public userProfiler: UserProfiler;
  public trajectory: TrajectoryRecorder;
  private turnCount = 0;

  constructor(memoryDbPath?: string, sessionId?: string) {
    const dbPath = memoryDbPath ?? path.join(os.homedir(), ".prometheus", "memory.db");
    this.memory = new MemoryStore(dbPath);
    this.skillCreator = new SkillCreator();
    this.userProfiler = new UserProfiler();
    this.trajectory = new TrajectoryRecorder(sessionId);
    // Write session start to JSONL transcript
    this.trajectory.beginSession({ system: "prometheus-learning" });
  }

  /** evaluate — called every N turns by agent loop */
  evaluate(ctx: ConversationContext): Skill | null {
    this.turnCount++;

    // 1. Store conversation in memory
    this.memory.store(ctx);

    // 2. Learn user preferences
    this.userProfiler.learn(ctx);

    // 3. Check for skill-able patterns
    const newSkill = this.skillCreator.evaluate(ctx);

    return newSkill ?? null;
  }

  get evaluatedTurns(): number {
    return this.turnCount;
  }
}
