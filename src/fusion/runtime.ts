/**
 * Prometheus Fusion Runtime Plugin.
 *
 * This file provides the run-loop integration layer that bridges
 * the existing embedded agent run loop with Prometheus's fusion systems.
 *
 * Integration points:
 *   BEFORE LLM CALL: governor.compress() + governor.route()
 *   AFTER TURN:      learning.evaluate() to store memory + learn
 *   ETHICS GATE:     checkEthics() before destructive commands
 */

export {
  initFusion,
  beforeLlmCall,
  afterLlmCall,
  afterTurn,
  shouldRunLearning,
  recordTrajectory,
  finalizeTrajectory,
  checkEthics,
  checkToolEthics,
  checkFileEthics,
  createWorktree,
  removeWorktree,
  listWorktrees,
  startAgentJob,
  stopAgentJob,
  listAgentJobs,
  getBudgetStatus,
  getTurnCount,
  getLearningSystem,
  getTokenGovernor,
  getWorktreeManager,
} from "./index.js";

export { WorktreeManager } from "./worktree.js";
export { EthicsGate, getEthicsGate } from "./permissions.js";
export { AgentLoop, getAgentLoop } from "./agent-loop.js";
