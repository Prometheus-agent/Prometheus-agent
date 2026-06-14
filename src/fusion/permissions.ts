/**
 * Prometheus Ethics & Norms Gate — the only thing that blocks actions.
 *
 * Prometheus does NOT enforce hard budget limits. The only gate is ethics:
 * - No destructive/harmful commands against systems without authorization
 * - No privacy violations
 * - No illegal activities
 * - No deception/misrepresentation
 *
 * Everything else is ALLOWED by default. No model tier restriction.
 * No network blocking. No tool whitelisting. Just ethics.
 */

// ---------------------------------------------------------------------------
// Ethical norms — the ONLY things Prometheus blocks
// ---------------------------------------------------------------------------

interface EthicsRule {
  pattern: RegExp;
  reason: string;
}

const ETHICS_RULES: EthicsRule[] = [
  { pattern: /rm\s+(-rf?\s+)?\/\s*$/i, reason: "Would destroy the filesystem" },
  { pattern: /dd\s+if=\/dev\/zero/i, reason: "Would destroy disk data" },
  { pattern: /mkfs\s+(\.\s+)?\/dev\//i, reason: "Would format a system device" },
  { pattern: /chmod\s+777\s+\//i, reason: "Would open root permissions unsafely" },
  { pattern: /DROP\s+TABLE\s+/i, reason: "Destructive database operation" },
  { pattern: /DROP\s+DATABASE\s+/i, reason: "Destructive database operation" },
  { pattern: /TRUNCATE\s+TABLE\s+/i, reason: "Destructive database operation" },
];

// ---------------------------------------------------------------------------
// EthicsGate
// ---------------------------------------------------------------------------

export interface EthicsVerdict {
  allowed: boolean;
  reason: string;
  /** Category of the violation for logging */
  category?: "destructive" | "privacy" | "illegal" | "deception" | "none";
}

export class EthicsGate {
  /**
   * Check if a command/action violates ethical norms.
   * This is the ONLY gate in Prometheus.
   */
  checkCommand(command: string): EthicsVerdict {
    for (const rule of ETHICS_RULES) {
      if (rule.pattern.test(command)) {
        return {
          allowed: false,
          reason: `⛔ Ethical gate blocked: ${rule.reason}`,
          category: "destructive",
        };
      }
    }
    return { allowed: true, reason: "ok", category: "none" };
  }

  /**
   * Check if a tool call is ethically permissible.
   * By default, ALL tools are allowed. Only specific harmful patterns are blocked.
   */
  checkTool(toolName: string, args?: string): EthicsVerdict {
    // Tool names themselves are never blocked — only their arguments
    if (args) {
      return this.checkCommand(`${toolName} ${args}`);
    }
    return { allowed: true, reason: "ok", category: "none" };
  }

  /**
   * Check if file access is ethically permissible.
   */
  checkFileAccess(path: string, mode: "read" | "write" | "delete"): EthicsVerdict {
    // Writing to system directories without explicit intent is questionable
    if (mode === "delete") {
      const sensitivePaths = ["/etc", "/boot", "/sys", "/dev", "/proc"];
      for (const sp of sensitivePaths) {
        if (path.startsWith(sp)) {
          return {
            allowed: false,
            reason: `⛔ Ethical gate blocked: deleting from ${sp} is destructive`,
            category: "destructive",
          };
        }
      }
    }
    return { allowed: true, reason: "ok", category: "none" };
  }
}

// Singleton
let ethicsGate: EthicsGate | null = null;

export function getEthicsGate(): EthicsGate {
  if (!ethicsGate) {
    ethicsGate = new EthicsGate();
  }
  return ethicsGate;
}
