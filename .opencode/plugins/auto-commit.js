// 会话结束自动提交插件。
//
// 每次对话结束（session.idle）时，若工作区有已跟踪文件的变更：
// 1. 创建一个独立的 opencode 会话，把暂存区 diff 发给它，
//    用结构化输出生成英文语义化提交信息（conventional commits）；
// 2. 用生成的提交信息提交（只提交不推送），随后删除独立会话。
//
// 防递归三重保障：模块级 busy 标志、内部会话 ID 名单、
// 提交后工作区干净（再次触发时因无变更直接返回）。
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
  // 兜底：从返回文本里抠出含 subject 的 JSON 对象。
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
      // 解析失败则走散文兜底。
    }
  }
  // 最后兜底：散文回复的首行当 subject，余下当 body，总好过无语义 fallback。
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
    // 注意：结构化输出走 body.outputFormat（OpenAPI 权威字段），不是 body.format。
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
      // 独立会话删不掉不影响主流程；ID 名单保证它不会触发提交。
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
      // 日志失败不影响提交。
    }
  };
  await log("info", `auto-commit hook loaded (directory=${directory})`);
  return {
    event: async ({ event }) => {
      // 只响应对话结束事件，其余事件直接返回。
      if (event.type !== "session.idle") return;
      await log("info", "session.idle received");
      // 内部会话自己的 idle 直接返回，不为它提交。
      const sid = sessionIdOf(event);
      if (sid && internalSessions.has(sid)) {
        internalSessions.delete(sid);
        return;
      }
      // 重入保护：上一轮提交流程未结束时直接返回。
      if (busy) {
        await log("warn", "skip: previous commit flow still running");
        return;
      }
      busy = true;
      try {
        // 非 git 仓库直接返回。
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
        // 收纳全部变更（git add -A，含未跟踪文件；.gitignore 仍生效）。
        // 注意：.gitignore 是唯一的防线——密钥、本地产物必须确认被忽略，
        // 否则会被自动提交。详见仓库根 .gitignore。
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
        // 无暂存变更则静默返回：不创建独立会话，不产生空提交。
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
