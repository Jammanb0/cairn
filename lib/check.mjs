// 문서 골격이 실제로 이어져 있는지 검사한다.
// 파일이 생겼다는 것과 서로 연결됐다는 것은 다르므로, 가리키는 곳이 실재하는지까지 본다.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const HEADING = /^## +현재 대작업/;
const NEXT_HEADING = /^## /;
const NAME = /([0-9]{3}-[a-z0-9-]+)/g;

const PROBLEM = "문제"; // 고쳐야 하는 것
const NOTICE = "확인"; // 사람이 판단할 것

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
// 이름으로 부르는 자리("해당 대작업의 workflow.md")라 실재를 물을 수 없다.
function documentTokens(line) {
  const found = [];
  for (const [, token] of line.matchAll(/`([^`]+)`/g)) {
    if (token.startsWith("@")) continue;
    if (!token.endsWith(".md")) continue;
    if (!token.includes("/")) continue;
    if (!/^[A-Za-z0-9._\-/]+$/.test(token)) continue;
    if (OTHER_TOOLS.has(token)) continue;
    // `.cairn/` 은 적용을 마치면 지우는 폴더다. 세팅 기록이 그 경로를 담고
    // 있는 것이 정상이므로 실재를 묻지 않는다. 활성 문서에 남은 참조는 5번이 본다.
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

// 루트 workflow.md 의 「현재 대작업」 절에 적힌 워크스트림 이름을 모은다.
// 주석 안의 작성 예시와 다른 절의 언급은 실제로 적힌 것이 아니다.
function currentSection(text) {
  if (text === null) return null;
  const lines = meaningfulLines(text).map((l) => l.text);
  const start = lines.findIndex((l) => HEADING.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => NEXT_HEADING.test(l));
  const section = (end === -1 ? rest : rest.slice(0, end)).join("\n");
  return [...section.matchAll(NAME)].map((m) => m[1]);
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
  if (!existsSync(join(root, ".agents"))) {
    add(PROBLEM, ".agents/", "폴더가 없습니다");
  } else if (agents !== null) {
    if (meaningfulLines(agents).some((l) => l.text.includes(".agents/"))) {
      passed.push("AGENTS.md → .agents/ 안내");
    } else {
      add(PROBLEM, "AGENTS.md", "`.agents/` 로 이어지는 안내가 없어 그 폴더를 아무도 읽지 않습니다");
    }
  }

  // 2. 문서가 가리키는 곳이 실재하는지
  const docs = [];
  if (agents !== null) docs.push(join(root, "AGENTS.md"));
  docs.push(...listMarkdown(join(root, ".agents")));
  let links = 0;
  let broken = 0;
  for (const doc of docs) {
    for (const { number, text } of meaningfulLines(readFileSync(doc, "utf8"))) {
      for (const token of documentTokens(text)) {
        links += 1;
        if (resolves(root, doc, token)) continue;
        broken += 1;
        add(PROBLEM, at(doc, number), `가리키는 ${token} 가 없습니다`);
      }
    }
  }
  if (links && !broken) passed.push(`문서가 가리키는 경로 ${links}곳`);

  // 3. 아직 채우지 않은 자리 — 파일마다 한 줄로 모은다
  let blanks = 0;
  for (const doc of docs) {
    const hits = readFileSync(doc, "utf8")
      .split(/\r?\n/)
      .map((line, index) => (/채우기|고르기|확인 필요/.test(line) ? index + 1 : 0))
      .filter(Boolean);
    if (!hits.length) continue;
    blanks += hits.length;
    add(NOTICE, at(doc), `아직 채우지 않은 자리 ${hits.length}곳 (${hits.slice(0, 5).join(", ")}${hits.length > 5 ? " …" : ""}행)`);
  }
  if (!blanks && docs.length) passed.push("채우기·고르기·확인 필요 자리 없음");

  // 4. 워크스트림 상태
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
    for (const required of ["README.md", "workflow.md"]) {
      if (existsSync(join(plansDir, name, required))) continue;
      workstreamClean = false;
      add(PROBLEM, at(join(plansDir, name)), `${required} 가 없습니다`);
    }
  }
  const listed = currentSection(read(root, ".agents/plans/workflow.md"));
  if (listed === null) {
    // 다른 문서 형식을 쓸 수 있으므로 문제로 보지 않는다.
    // 다만 대조하지 못한 것을 통과로 적으면 안 된다.
    if (active.length) {
      workstreamClean = false;
      add(
        NOTICE,
        ".agents/plans/workflow.md",
        "「현재 대작업」을 찾지 못해 워크스트림과 대조하지 못했습니다"
      );
    }
  } else {
    for (const name of active) {
      if (listed.includes(name)) continue;
      workstreamClean = false;
      add(PROBLEM, ".agents/plans/workflow.md", `「현재 대작업」에 ${name} 이 없어 새 세션이 찾지 못합니다`);
    }
    // 반대쪽 — 적혀 있는데 폴더가 없으면 이어받을 곳이 없다.
    for (const name of listed) {
      if (active.includes(name)) continue;
      workstreamClean = false;
      add(PROBLEM, ".agents/plans/workflow.md", `${name} 이 적혀 있는데 그 폴더가 없습니다`);
    }
  }
  if (active.length && workstreamClean) passed.push(`진행 중인 대작업 ${active.length}개`);

  // 5. 곧 지울 폴더를 활성 문서가 가리키는지
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
  if (result.problems.length) {
    lines.push(`✗ 문제 ${result.problems.length}개`);
    for (const f of result.problems) lines.push(`  ${f.where.padEnd(width)}  ${f.message}`);
  }
  if (result.notices.length) {
    if (lines.length) lines.push("");
    lines.push(`! 확인 ${result.notices.length}개`);
    for (const f of result.notices) lines.push(`  ${f.where.padEnd(width)}  ${f.message}`);
  }
  if (result.passed.length) {
    if (lines.length) lines.push("");
    lines.push("✓ 통과");
    for (const p of result.passed) lines.push(`  ${p}`);
  }
  if (!lines.length) lines.push("검사할 것을 찾지 못했습니다.");
  return lines.join("\n") + "\n";
}
