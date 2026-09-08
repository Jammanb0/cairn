// 문서 골격이 실제로 이어져 있는지 검사한다.
// 파일이 생겼다는 것과 서로 연결됐다는 것은 다르므로, 가리키는 곳이 실재하는지까지 본다.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const NAME = /([0-9]{3}-[a-z0-9-]+)/g;
// 자리표시자는 주석 형태로만 셉니다. 절차를 설명하느라 그 말이 들어간 문장까지
// 세면 오탐이 쌓이고, 오탐을 내는 검사는 아무도 보지 않게 됩니다.
const MARKER = new RegExp("^[ ]*<!--[ ]*(채우기|고르기|확인 필요)[ ]*:");
const ARCHIVE = ".agents/archive/";

const PROBLEM = "문제"; // 고쳐야 하는 것
const NOTICE = "확인"; // 사람이 판단할 것

// 골격이 자리를 잡았다면 반드시 있어야 하는 문서.
const REQUIRED = [
  ".agents/project.md",
  ".agents/plans/README.md",
  ".agents/plans/current.md",
  ".agents/plans/workstreams.md",
  ".agents/plans/ideas.md",
  ".agents/plans/history.md",
];

// 활성 워크스트림의 필수 문서. plan.md, design.md, decisions.md 는 있을 때만 본다.
const WORKSTREAM_REQUIRED = ["README.md", "status.md"];

// 0.1.x 구조는 정상으로 인정하지 않는다. 다만 무엇이 어디로 갔는지는 알려 준다.
// 지원하는 기능이 아니라 실패 이유를 알려 주는 안내다.
const LEGACY_ROOT = [
  {
    path: ".agents/plans/workflow.md",
    message:
      "이전 cairn 문서 구조입니다. 새 구조에서는 이렇게 나뉩니다\n" +
      "현재 작업 목록: `.agents/plans/current.md`\n" +
      "대작업 운영 절차: `.agents/plans/workstreams.md`",
  },
  {
    path: ".agents/plans/goal.md",
    message:
      "이전 cairn 문서 구조입니다. 프로젝트 전체 설명은 `.agents/project.md` 로 옮겼습니다",
  },
];

const LEGACY_WORKSTREAM = {
  file: "workflow.md",
  message:
    "이전 cairn 문서 구조입니다. 새 구조에서는 이렇게 나뉩니다\n" +
    "현재 상태와 다음 행동: `status.md`\n" +
    "작업 순서와 검증 방법: `plan.md`\n" +
    "결정과 그 이유: `decisions.md`",
};

// 다른 도구의 지시 파일은 "이런 것들이 해당한다"고 열거하는 자리라 실재 여부를 묻지 않는다.
const OTHER_TOOLS = new Set([
  "AGENTS.override.md",
  "CLAUDE.local.md",
  ".cursorrules",
  ".github/copilot-instructions.md",
]);

function read(root, name) {
  const path = join(root, name);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function listMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) listMarkdown(path, out);
    else if (entry.endsWith(".md")) out.push(path);
  }
  return out;
}

// 코드 블록과 HTML 주석은 안내가 아니라 예시이므로 검사에서 뺀다.
function meaningfulLines(text) {
  const lines = [];
  let inFence = false;
  let inComment = false;
  text.split(/\r?\n/).forEach((raw, index) => {
    let line = raw;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (inComment) {
      const end = line.indexOf("-->");
      if (end === -1) return;
      line = line.slice(end + 3);
      inComment = false;
    }
    line = line.replace(/<!--[\s\S]*?-->/g, "");
    const open = line.indexOf("<!--");
    if (open !== -1) {
      line = line.slice(0, open);
      inComment = true;
    }
    if (line.trim()) lines.push({ number: index + 1, text: line });
  });
  return lines;
}

// 백틱으로 감싼 것 중 다른 문서를 가리키는 링크만 고른다.
// 폴더와 확장자 없는 것은 구조 설명이나 브랜치 이름이라 대상이 아니다.
// 파일명만 쓴 것도 뺀다. 같은 폴더를 가리키거나, 대작업마다 생기는 문서를
// 이름으로 부르는 자리("그 대작업의 status.md")라 실재를 물을 수 없다.
function documentTokens(line) {
  const found = [];
  for (const [, token] of line.matchAll(/`([^`]+)`/g)) {
    if (token.startsWith("@")) continue;
    if (!token.endsWith(".md")) continue;
    if (!token.includes("/")) continue;
    if (!/^[A-Za-z0-9._\-/]+$/.test(token)) continue;
    if (OTHER_TOOLS.has(token)) continue;
    // `.cairn/` 은 적용을 마치면 지우는 폴더다. 세팅 기록이 그 경로를 담고
    // 있는 것이 정상이므로 실재를 묻지 않는다. 활성 문서에 남은 참조는 7번이 본다.
    if (token.startsWith(".cairn/")) continue;
    found.push(token);
  }
  return found;
}

// 같은 폴더는 파일명으로 줄여 쓰고 다른 폴더는 저장소 루트 기준으로 쓴다.
function resolves(root, doc, token) {
  return existsSync(join(dirname(doc), token)) || existsSync(join(root, token));
}

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

// current.md 는 파일 하나가 통째로 진행 중인 대작업 목록이라 절을 찾지 않는다.
// 주석 안의 작성 예시와 코드 블록은 실제로 적힌 것이 아니므로 빠진다.
function listedWorkstreams(text) {
  if (text === null) return null;
  const body = meaningfulLines(text)
    .map((l) => l.text)
    .join("\n");
  return [...new Set([...body.matchAll(NAME)].map((m) => m[1]))];
}

// 아카이브는 지나간 기록입니다. 채울 자리가 없고, 그때의 경로를 담고 있는 것도
// 정상이므로 판정을 달리합니다.
function isArchived(root, doc) {
  return relative(root, doc).split(sep).join("/").startsWith(ARCHIVE);
}

export function check(root) {
  const findings = [];
  const passed = [];
  const at = (file, line) => `${relative(root, file).split(sep).join("/")}${line ? `:${line}` : ""}`;
  const add = (kind, where, message) => findings.push({ kind, where, message });

  // 1. 진입점이 있고 서로 이어지는지
  const agents = read(root, "AGENTS.md");
  const claude = read(root, "CLAUDE.md");
  if (agents === null) add(PROBLEM, "AGENTS.md", "규칙 원본이 없습니다");
  if (claude === null) {
    add(PROBLEM, "CLAUDE.md", "없습니다. Claude Code가 규칙을 읽을 길이 없습니다");
  } else {
    // 주석 안의 `@AGENTS.md` 는 import 가 아니므로 본문만 본다.
    const body = meaningfulLines(claude)
      .map((l) => l.text.trim())
      .join("\n");
    if (!body.includes("@AGENTS.md")) {
      add(PROBLEM, "CLAUDE.md", "`@AGENTS.md` 가 없어 AGENTS.md로 이어지지 않습니다");
    } else if (body !== "@AGENTS.md") {
      add(PROBLEM, "CLAUDE.md", "`@AGENTS.md` 한 줄이 아닙니다. 여기 적은 본문은 Codex가 읽지 못해 규칙이 갈라집니다");
    } else if (agents !== null) {
      passed.push("CLAUDE.md → AGENTS.md 연결");
    }
  }

  // 폴더가 있는 것과 AGENTS.md가 그리로 안내하는 것은 다르다.
  const hasAgentsDir = existsSync(join(root, ".agents"));
  if (!hasAgentsDir) {
    add(PROBLEM, ".agents/", "폴더가 없습니다");
  } else if (agents !== null) {
    if (meaningfulLines(agents).some((l) => l.text.includes(".agents/"))) {
      passed.push("AGENTS.md → .agents/ 안내");
    } else {
      add(PROBLEM, "AGENTS.md", "`.agents/` 로 이어지는 안내가 없어 그 폴더를 아무도 읽지 않습니다");
    }
  }

  // 2. 이전 구조가 남아 있는지 — 무엇이 어디로 갔는지 먼저 알린다
  let legacy = 0;
  if (hasAgentsDir) {
    for (const { path, message } of LEGACY_ROOT) {
      if (!existsSync(join(root, path))) continue;
      legacy += 1;
      add(PROBLEM, path, message);
    }
  }

  // 3. 새 규격의 필수 문서가 있는지
  let missing = 0;
  if (hasAgentsDir) {
    for (const path of REQUIRED) {
      if (existsSync(join(root, path))) continue;
      missing += 1;
      add(PROBLEM, path, "없습니다. 골격의 필수 문서입니다");
    }
    if (!missing && !legacy) passed.push(`필수 문서 ${REQUIRED.length}개`);
  }

  // 4. 문서가 가리키는 곳이 실재하는지
  const docs = [];
  if (agents !== null) docs.push(join(root, "AGENTS.md"));
  docs.push(...listMarkdown(join(root, ".agents")));
  let links = 0;
  let broken = 0;
  let staleArchive = 0;
  for (const doc of docs) {
    for (const { number, text } of meaningfulLines(readFileSync(doc, "utf8"))) {
      const archived = isArchived(root, doc);
      for (const token of documentTokens(text)) {
        if (!archived) links += 1;
        if (resolves(root, doc, token)) continue;
        if (archived) {
          staleArchive += 1;
          add(NOTICE, at(doc, number), `가리키는 ${token} 가 지금은 없습니다`);
          continue;
        }
        broken += 1;
        add(PROBLEM, at(doc, number), `가리키는 ${token} 가 없습니다`);
      }
    }
  }
  if (links && !broken) {
    passed.push(
      staleArchive
        ? `활성 문서가 가리키는 경로 ${links}곳 (아카이브 ${staleArchive}곳은 아래 확인)`
        : `문서가 가리키는 경로 ${links}곳`
    );
  }

  // 5. 아직 채우지 않은 자리 — 파일마다 한 줄로 모은다
  let blanks = 0;
  for (const doc of docs) {
    if (isArchived(root, doc)) continue;
    const hits = readFileSync(doc, "utf8")
      .split(/\r?\n/)
      .map((line, index) => (MARKER.test(line) ? index + 1 : 0))
      .filter(Boolean);
    if (!hits.length) continue;
    blanks += hits.length;
    add(NOTICE, at(doc), `아직 채우지 않은 자리 ${hits.length}곳 (${hits.slice(0, 5).join(", ")}${hits.length > 5 ? " …" : ""}행)`);
  }
  if (!blanks && docs.length) passed.push("채우기·고르기·확인 필요 자리 없음");

  // 6. 워크스트림 상태
  const plansDir = join(root, ".agents/plans/workstreams");
  const archiveDir = join(root, ".agents/archive/workstreams");
  const active = subdirs(plansDir);
  const archived = subdirs(archiveDir);
  let workstreamClean = true;
  const numbers = new Map();
  for (const [dir, name] of [
    ...active.map((n) => [plansDir, n]),
    ...archived.map((n) => [archiveDir, n]),
  ]) {
    if (!/^\d{3}-[a-z0-9-]+$/.test(name)) {
      workstreamClean = false;
      add(NOTICE, at(join(dir, name)), "이름이 `<세 자리 번호>-<영문 소문자>` 형식이 아닙니다");
    }
    const number = name.slice(0, 3);
    if (numbers.has(number)) {
      workstreamClean = false;
      add(PROBLEM, at(join(dir, name)), `번호 ${number} 가 ${numbers.get(number)} 와 겹칩니다`);
    } else {
      numbers.set(number, name);
    }
  }
  for (const name of active) {
    for (const required of WORKSTREAM_REQUIRED) {
      if (existsSync(join(plansDir, name, required))) continue;
      workstreamClean = false;
      add(PROBLEM, at(join(plansDir, name)), `${required} 가 없습니다`);
    }
    // 아카이브의 workflow.md 는 그때의 기록이므로 활성 폴더만 본다.
    if (existsSync(join(plansDir, name, LEGACY_WORKSTREAM.file))) {
      workstreamClean = false;
      legacy += 1;
      add(PROBLEM, at(join(plansDir, name, LEGACY_WORKSTREAM.file)), LEGACY_WORKSTREAM.message);
    }
  }
  const listed = listedWorkstreams(read(root, ".agents/plans/current.md"));
  if (listed !== null) {
    for (const name of active) {
      if (listed.includes(name)) continue;
      workstreamClean = false;
      add(PROBLEM, ".agents/plans/current.md", `${name} 이 없어 새 세션이 찾지 못합니다`);
    }
    // 반대쪽 — 적혀 있는데 폴더가 없으면 이어받을 곳이 없다.
    for (const name of listed) {
      if (active.includes(name)) continue;
      workstreamClean = false;
      add(PROBLEM, ".agents/plans/current.md", `${name} 이 적혀 있는데 그 폴더가 없습니다`);
    }
  }
  if (active.length && workstreamClean) passed.push(`진행 중인 대작업 ${active.length}개`);

  // 7. 곧 지울 폴더를 활성 문서가 가리키는지
  for (const doc of docs) {
    if (doc.includes("-cairn-setup")) continue;
    const hits = readFileSync(doc, "utf8")
      .split(/\r?\n/)
      .map((line, index) => (line.includes(".cairn") ? index + 1 : 0))
      .filter(Boolean);
    if (hits.length) add(NOTICE, at(doc), `\`.cairn\` 참조가 ${hits.length}곳 남아 있습니다 (${hits.join(", ")}행)`);
  }

  return {
    problems: findings.filter((f) => f.kind === PROBLEM),
    notices: findings.filter((f) => f.kind === NOTICE),
    passed,
  };
}

export function format(result) {
  const lines = [];
  const width = Math.max(0, ...[...result.problems, ...result.notices].map((f) => f.where.length));
  // 여러 줄짜리 안내는 두 번째 줄부터 메시지 열에 맞춰 들여쓴다.
  const indent = " ".repeat(2 + width + 2);
  const entry = (f) => {
    const [head, ...rest] = f.message.split("\n");
    return [`  ${f.where.padEnd(width)}  ${head}`, ...rest.map((line) => `${indent}${line}`)];
  };
  if (result.problems.length) {
    lines.push(`✗ 문제 ${result.problems.length}개`);
    for (const f of result.problems) lines.push(...entry(f));
  }
  if (result.notices.length) {
    if (lines.length) lines.push("");
    lines.push(`! 확인 ${result.notices.length}개`);
    for (const f of result.notices) lines.push(...entry(f));
  }
  if (result.passed.length) {
    if (lines.length) lines.push("");
    lines.push("✓ 통과");
    for (const p of result.passed) lines.push(`  ${p}`);
  }
  if (!lines.length) lines.push("검사할 것을 찾지 못했습니다.");
  return lines.join("\n") + "\n";
}
