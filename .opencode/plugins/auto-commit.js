// Auto-commit plugin on session end.
//
// When a conversation ends (session.idle) and the workspace has tracked-file changes:
// 1. Create an isolated opencode session, send it the staged diff,
//    and generate an English semantic commit message via structured output (conventional commits);
// 2. Commit with the generated message (commit only, no push), then delete the isolated session.
//
// Triple recursion guard: module-level busy flag, internal session ID list,
// and a clean tree after commit (re-trigger returns early with no changes).
const INTERNAL_TITLE = "[auto-commit hook] commit message generator";
const DIFF_BUDGET = 12000;
const PROMPT_TIMEOUT_MS = 120000;

let busy = false;
const internalSessions = new Set();

const MESSAGE_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description:
        "Conventional-commit subject line in English, imperative mood, max 72 characters, e.g. 'feat: ...' or 'fix: ...'. No Chinese, no trailing period.",
    },
    body: {
      type: "string",
      description:
        "Bullet list in English explaining what changed and why, one bullet per area. No Chinese.",
    },
  },
  required: ["subject", "body"],
};

function sessionIdOf(event) {
  const properties = event.properties ?? {};
  return (
    properties.sessionID ??
    properties.sessionId ??
    properties.id ??
    properties.info?.id ??
    null
  );
}

function collectText(node, out) {
  if (node == null) return;
  if (typeof node === "string") return;
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, out);
    return;
  }
  if (typeof node === "object") {
    if (typeof node.text === "string") out.push(node.text);
    for (const value of Object.values(node)) collectText(value, out);
  }
}

const BODY_BUDGET = 2000;

function sanitizeSubject(value) {
  return value
    .split("\n")[0]
    .replace(/^[`"'“”]+|[`"'“”]+$/g, "")
    .trim()
    .slice(0, 100);
}

function fromProseText(joined) {
  const lines = joined
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const subject = sanitizeSubject(lines[0].replace(/^\{?"subject"\s*:\s*"?/, "").replace(/"?,?\}?$/, ""));
  if (!subject) return null;
  const body = lines
    .slice(1)
    .join("\n")
    .replace(/[{}"]/g, "")
    .trim()
    .slice(0, BODY_BUDGET);
  return { subject, body };
}

function extractMessage(result) {
  const data = result?.data;
  const structured =
    data?.info?.structured_output ?? data?.structured_output ?? null;
  if (
    structured &&
    typeof structured.subject === "string" &&
    structured.subject.trim()
  ) {
    return {
      subject: sanitizeSubject(structured.subject),
      body: String(structured.body ?? "").trim(),
    };
  }
  // Fallback: extract the JSON object containing subject from the returned text.
  const texts = [];
  collectText(data, texts);
  const joined = texts.join("\n");
  const match = joined.match(/\{[\s\S]*"subject"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.subject === "string" && parsed.subject.trim()) {
        return {
          subject: sanitizeSubject(parsed.subject),
          body: String(parsed.body ?? "").trim(),
        };
      }
    } catch {
      // On parse failure, fall back to prose parsing.
    }
  }
  // Last fallback: use the first prose line as subject and the rest as body, better than a semantics-free fallback.
  return fromProseText(joined);
}

function fallbackMessage(fileCount, stat) {
  return {
    subject: "chore: sync working tree changes",
    body: [
      `- ${fileCount} file(s) changed; LLM summary unavailable (generation failed).`,
      `- Stat: ${stat || "n/a"}`,
    ].join("\n"),
  };
}

async function generateCommitMessage(client, diff, files) {
  const created = await client.session.create({ body: { title: INTERNAL_TITLE } });
  const helperId = created?.data?.id;
  if (!helperId) throw new Error("failed to create helper session");
  internalSessions.add(helperId);
  try {
    const prompt = [
      "You are a commit message generator. Write a commit message for the changes below.",
      "Rules:",
      "- English only.",
      "- Conventional commits: type must be one of feat, fix, docs, refactor, test, chore, perf, ci, build.",
      "- Subject: imperative mood, max 72 characters, no trailing period.",
      "- Body: bullet list of what changed and why, one bullet per area.",
      "- Base the message ONLY on the diff below; do not invent changes.",
      '- Reply with ONLY a JSON object {"subject": "...", "body": "..."}, no prose, no code fences.',
      "",
      "Changed files:",
      ...files.map((file) => `- ${file}`),
      "",
      "Diff (may be truncated):",
      diff,
    ].join("\n");
    // Note: structured output uses body.outputFormat (the authoritative OpenAPI field), not body.format.
    const result = await client.session.prompt({
      path: { id: helperId },
      body: {
        parts: [{ type: "text", text: prompt }],
        outputFormat: { type: "json_schema", schema: MESSAGE_SCHEMA },
      },
    });
    if (result?.error) throw new Error(String(result.error));
    const structuredError = result?.data?.info?.error;
    if (structuredError) throw new Error(`structured output: ${structuredError.name ?? "error"} ${structuredError.message ?? ""}`.trim());
    return extractMessage(result);
  } finally {
    try {
      await client.session.delete({ path: { id: helperId } });
    } catch {
      // Failing to delete the isolated session does not affect the main flow; the ID list keeps it from triggering a commit.
    }
  }
}

export const AutoCommitPlugin = async ({ $, directory, client }) => {
  const log = async (level, message) => {
    try {
      await client.app.log({
        body: { service: "auto-commit", level, message },
      });
    } catch {
      // Logging failures do not affect the commit.
    }
  };
  await log("info", `auto-commit hook loaded (directory=${directory})`);
  return {
    event: async ({ event }) => {
      // Only respond to conversation-end events, return early for everything else.
      if (event.type !== "session.idle") return;
      await log("info", "session.idle received");
      // Return early for internal sessions' own idle events, never commit for them.
      const sid = sessionIdOf(event);
      if (sid && internalSessions.has(sid)) {
        internalSessions.delete(sid);
        return;
      }
      // Reentrancy guard: return early while the previous commit flow is still running.
      if (busy) {
        await log("warn", "skip: previous commit flow still running");
        return;
      }
      busy = true;
      try {
        // Return early when not inside a git repo.
        const inside = (
          await $`git -C ${directory} rev-parse --is-inside-work-tree`
            .quiet()
            .nothrow()
            .text()
        ).trim();
        if (inside !== "true") {
          await log("warn", "skip: not inside a git work tree");
          return;
        }
        // Stage all changes (git add -A, including untracked files; .gitignore still applies).
        // Note: .gitignore is the only line of defense — secrets and local artifacts must be confirmed ignored,
        // otherwise they will be auto-committed. See the repo-root .gitignore.
        await $`git -C ${directory} add -A`.quiet().nothrow();
        const cached = (
          await $`git -C ${directory} diff --cached --name-only`
            .quiet()
            .nothrow()
            .text()
        ).trim();
        const files = cached
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        // Return silently with no staged changes: create no isolated session, produce no empty commit.
        if (files.length === 0) {
          await log("info", "skip: no staged changes");
          return;
        }
        let diff = (
          await $`git -C ${directory} diff --cached`.quiet().nothrow().text()
        ).trim();
        if (diff.length > DIFF_BUDGET) {
          diff = `${diff.slice(0, DIFF_BUDGET)}\n... [truncated]`;
        }
        const stat = (
          await $`git -C ${directory} diff --cached --shortstat`
            .quiet()
            .nothrow()
            .text()
        ).trim();
        let message = null;
        try {
          message = await Promise.race([
            generateCommitMessage(client, diff, files),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("commit message timeout")),
                PROMPT_TIMEOUT_MS,
              ),
            ),
          ]);
          if (message) {
            await log("info", `auto-commit: message generated: ${message.subject}`);
          } else {
            await log("warn", "auto-commit: prompt returned no usable text, using fallback");
          }
        } catch (error) {
          await log(
            "warn",
            `auto-commit: LLM message generation failed, using fallback: ${String(error)}`,
          );
          message = null;
        }
        const finalMessage = message ?? fallbackMessage(files.length, stat);
        const footer =
          "Generated by opencode auto-commit hook; commit only, no push.";
        const body = finalMessage.body
          ? `${finalMessage.body}\n\n${footer}`
          : footer;
        const commitResult =
          await $`git -C ${directory} commit -m ${finalMessage.subject} -m ${body}`
            .quiet()
            .nothrow();
        if (commitResult.exitCode !== 0) {
          await log(
            "error",
            `auto-commit: git commit failed (exit ${commitResult.exitCode}): ${(commitResult.text() || "").trim().slice(0, 500)}`,
          );
        } else {
          await log(
            "info",
            `auto-commit: committed ${files.length} file(s): ${finalMessage.subject}`,
          );
        }
      } catch (error) {
        await log("error", `auto-commit: flow failed: ${String(error)}`);
      } finally {
        busy = false;
      }
    },
  };
};
