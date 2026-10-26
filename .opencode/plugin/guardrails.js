// guardrails.js — local opencode plugin (loaded automatically from .opencode/plugin/).
// This project sets "type": "module", so this file is ES Module syntax.
//
// Purpose: lightweight guardrails ported from the old .claude/hooks setup:
//   1. Warn when edits introduce console.log / debugger / TODO / FIXME markers.
//   2. Best-effort `tsc --noEmit` typecheck after edits to .ts/.tsx files.
//   3. Bounded session-memory notes so context survives across sessions.
//
// Everything is best-effort: failures are swallowed, never fatal. Each guard
// can be disabled via an env var. No third-party dependencies.
//
// After changing plugin code, restart opencode for it to reload.

import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

const conf = {
  warnDebugStatements: process.env.OPENCODE_GUARD_WARN_DEBUG !== "0",
  warnTODOMarkers: process.env.OPENCODE_GUARD_WARN_TODO !== "0",
  runTscOnTsEdits: process.env.OPENCODE_GUARD_TSC !== "0",
  persistSessionNotes: process.env.OPENCODE_GUARD_NOTES !== "0",
  tscTimeoutMs: Number(process.env.OPENCODE_GUARD_TSC_TIMEOUT || 30000),
  notesMaxFiles: Number(process.env.OPENCODE_GUARD_NOTES_MAX || 30),
};

function log(prefix, message) {
  try {
    // eslint-disable-next-line no-console
    console[process.env.OPENCODE_GUARD_QUIET === "1" ? "debug" : "log"](
      `[guardrails] ${prefix} ${message}`
    );
  } catch {
    /* ignore */
  }
}

const DEBUG_RX = /(^|[^:\w])console\.(log|debug|trace)\(|\bdebugger\b/;
const TODO_RX = /\b(TODO|FIXME|HACK)\b/i;

async function runTsc(projectDir) {
  let hasTsconfig = false;
  let hasLocalTsc = false;
  try {
    hasTsconfig = fs.existsSync(path.join(projectDir, "tsconfig.json"));
    hasLocalTsc = fs.existsSync(path.join(projectDir, "node_modules", ".bin", "tsc"));
  } catch {
    return false;
  }
  if (!hasTsconfig || !hasLocalTsc) return false;

  return new Promise((resolve) => {
    const started = Date.now();
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(cmd, ["tsc", "--noEmit"], {
      cwd: projectDir,
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
    });

    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      log("tsc", "timed out after " + conf.tscTimeoutMs + "ms, skipped");
      resolve(false);
    }, conf.tscTimeoutMs);

    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      const elapsedMs = Date.now() - started;
      if (code === 0) {
        log("tsc", `passed in ${elapsedMs}ms`);
        resolve(true);
      } else {
        log("warn", `tsc found type errors (exit ${code}, ${elapsedMs}ms). Run 'npx tsc --noEmit' to see them.`);
        resolve(false);
      }
    });
  });
}

async function writeSessionNote(projectDir, text) {
  if (!conf.persistSessionNotes) return;
  const dir = path.join(projectDir, ".opencode", "sessions");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(dir, `note-${stamp}.md`), text, "utf8");

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("note-") && f.endsWith(".md"))
      .sort();
    while (files.length > conf.notesMaxFiles) {
      fs.unlinkSync(path.join(dir, files.shift()));
    }
  } catch {
    /* ignore */
  }
}

async function runGuard(input) {
  const filePath = input && input.filePath ? input.filePath : "";
  const projectDir = input && input.project ? input.project : "";

  if (!filePath || !projectDir) return;

  const content = (typeof input.content === "string" ? input.content : "") || "";

  if (conf.warnDebugStatements && DEBUG_RX.test(content) && !/\.(test|spec)\./.test(filePath)) {
    log("warn", `console.log/debugger left in ${filePath}. Remove before finishing.`);
  }
  if (conf.warnTODOMarkers && TODO_RX.test(content)) {
    log("warn", `TODO/FIXME marker in ${filePath}. Link a ticket or remove.`);
  }

  if (conf.runTscOnTsEdits && /\.tsx?$/.test(filePath) && !filePath.includes("node_modules")) {
    await runTsc(projectDir);
  }
}

/**
 * Plugin entry point. Hook shape follows the opencode plugin API:
 * each hook key wires to tool.execute/event lifecycle events.
 */
export default async () => {
  return {
    "tool.execute.after": async (input, output) => {
      const name = input && input.tool && input.tool.name;
      if (name === "edit" || name === "write") {
        const meta = (input && input.tool && input.tool.metadata) || {};
        await runGuard({ filePath: meta.filePath, content: output && output.content, project: meta.project });
      }
      return {};
    },
    "event": async (input) => {
      const type = input && input.type;
      if (conf.persistSessionNotes && type === "session.idle") {
        const projectDir = input && input.project;
        if (projectDir) {
          await writeSessionNote(
            projectDir,
            `# Session checkpoint\n- time: ${new Date().toISOString()}\n- state: session marked idle; consider a fresh task summary for the next run.\n`
          );
        }
      }
      return {};
    },
  };
};