import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { check, format } from "../lib/check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 골격을 복사한 임시 프로젝트를 만든다. 테스트마다 독립이다.
function project(setup) {
  const dir = mkdtempSync(join(tmpdir(), "cairn-test-"));
  cpSync(join(ROOT, "template"), dir, { recursive: true });
  if (setup) setup(dir);
  return dir;
}

// 새 규격의 최소 워크스트림 — README.md 와 status.md 만 둔다.
function makeWorkstream(dir, name, extra = []) {
  const path = join(dir, ".agents/plans/workstreams", name);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "README.md"), "# 대작업\n");
  writeFileSync(join(path, "status.md"), "# 상태\n");
  for (const file of extra) writeFileSync(join(path, file), `# ${file}\n`);
  return path;
}

// current.md 에 이 워크스트림들을 적는다.
function listCurrent(dir, ...names) {
  const body = names
    .map(
      (name) =>
        `- **${name}**\n` +
        `  - 소개: \`.agents/plans/workstreams/${name}/README.md\`\n` +
        `  - 상태: \`.agents/plans/workstreams/${name}/status.md\`\n`
    )
    .join("");
  writeFileSync(join(dir, ".agents/plans/current.md"), `# 현재 대작업\n\n${body}`);
}

function messages(result) {
  return [...result.problems, ...result.notices].map((f) => f.message).join("\n");
}

test("갓 만든 골격에는 문제가 없다", () => {
  const dir = project();
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.ok(result.passed.includes("CLAUDE.md → AGENTS.md 연결"));
    assert.ok(result.passed.includes("필수 문서 6개"), result.passed.join(", "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLAUDE.md가 AGENTS.md로 이어지지 않으면 잡는다", () => {
  const dir = project((d) => writeFileSync(join(d, "CLAUDE.md"), "규칙을 여기 직접 적었다\n"));
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /AGENTS.md로 이어지지 않습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("안내표가 없는 파일을 가리키면 잡는다", () => {
  const dir = project((d) =>
    appendFileSync(join(d, "AGENTS.md"), "\n| 배포할 때 | `.agents/rules/deploy.md` |\n")
  );
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /deploy\.md 가 없습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("대작업마다 생기는 문서를 이름으로 부르는 것은 잡지 않는다", () => {
  const dir = project((d) =>
    appendFileSync(join(d, "AGENTS.md"), "\n그 대작업의 `status.md`와 `plan.md`를 봅니다.\n")
  );
  try {
    assert.deepEqual(check(dir).problems, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("코드 블록과 주석 안의 경로는 검사하지 않는다", () => {
  const dir = project((d) =>
    appendFileSync(
      join(d, "AGENTS.md"),
      "\n<!-- 예) | 배포할 때 | `docs/DEPLOY.md` | -->\n\n```text\n`docs/NOPE.md`\n```\n"
    )
  );
  try {
    assert.deepEqual(check(dir).problems, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 새 규격의 필수 문서

test("필수 문서가 빠지면 그 자리를 잡는다", () => {
  const dir = project((d) => rmSync(join(d, ".agents/plans/ideas.md")));
  try {
    const result = check(dir);
    assert.ok(
      result.problems.some(
        (f) => f.where === ".agents/plans/ideas.md" && /필수 문서/.test(f.message)
      ),
      messages(result)
    );
    assert.ok(!result.passed.some((p) => p.includes("필수 문서")), result.passed.join(", "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("워크스트림에 status.md가 없고 current.md에도 안 적혔으면 둘 다 잡는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/plans/workstreams/004-search-rework");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 2, messages(result));
    assert.match(messages(result), /status\.md 가 없습니다/);
    assert.match(messages(result), /004-search-rework 이 없어 새 세션이 찾지 못합니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("plan.md·design.md·decisions.md는 없어도 문제가 아니고 있어도 문제가 아니다", () => {
  const bare = project((d) => {
    makeWorkstream(d, "004-search-rework");
    listCurrent(d, "004-search-rework");
  });
  const full = project((d) => {
    makeWorkstream(d, "004-search-rework", ["plan.md", "design.md", "decisions.md"]);
    listCurrent(d, "004-search-rework");
  });
  try {
    assert.deepEqual(check(bare).problems, [], messages(check(bare)));
    assert.deepEqual(check(full).problems, [], messages(check(full)));
    assert.ok(check(full).passed.includes("진행 중인 대작업 1개"));
  } finally {
    rmSync(bare, { recursive: true, force: true });
    rmSync(full, { recursive: true, force: true });
  }
});

// 이전 구조를 만났을 때

test("이전 루트 workflow.md를 만나면 어디로 나뉘었는지 알린다", () => {
  const dir = project((d) =>
    writeFileSync(join(d, ".agents/plans/workflow.md"), "# 전체 작업 흐름\n\n## 현재 대작업\n")
  );
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1, messages(result));
    assert.equal(result.problems[0].where, ".agents/plans/workflow.md");
    assert.match(result.problems[0].message, /이전 cairn 문서 구조입니다/);
    assert.match(result.problems[0].message, /\.agents\/plans\/current\.md/);
    assert.match(result.problems[0].message, /\.agents\/plans\/workstreams\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("이전 goal.md를 만나면 project.md로 옮기라고 알린다", () => {
  const dir = project((d) => writeFileSync(join(d, ".agents/plans/goal.md"), "# 목표\n"));
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1, messages(result));
    assert.equal(result.problems[0].where, ".agents/plans/goal.md");
    assert.match(result.problems[0].message, /\.agents\/project\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("활성 워크스트림의 workflow.md를 만나면 셋으로 나뉘었다고 알린다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "004-search-rework", ["workflow.md"]);
    listCurrent(d, "004-search-rework");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1, messages(result));
    assert.equal(
      result.problems[0].where,
      ".agents/plans/workstreams/004-search-rework/workflow.md"
    );
    assert.match(result.problems[0].message, /status\.md/);
    assert.match(result.problems[0].message, /plan\.md/);
    assert.match(result.problems[0].message, /decisions\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("아카이브에 남은 workflow.md는 그때의 기록이라 잡지 않는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-old");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 지난 대작업\n");
    writeFileSync(join(path, "workflow.md"), "# 진행\n");
  });
  try {
    assert.deepEqual(check(dir).problems, [], messages(check(dir)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("여러 줄짜리 안내는 메시지 열에 맞춰 들여쓴다", () => {
  const dir = project((d) => writeFileSync(join(d, ".agents/plans/workflow.md"), "# 전체 작업 흐름\n"));
  try {
    const lines = format(check(dir)).split("\n");
    const head = lines.findIndex((l) => l.includes("이전 cairn 문서 구조입니다"));
    assert.ok(head !== -1, lines.join("\n"));
    const next = lines[head + 1];
    assert.match(next, /^ {2,}현재 작업 목록: /);
    assert.equal(next.indexOf("현재"), lines[head].indexOf("이전"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 워크스트림 번호와 목록

test("워크스트림 번호가 겹치면 잡는다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "001-first");
    listCurrent(d, "001-first");
    const path = join(d, ".agents/archive/workstreams/001-second");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1, messages(result));
    assert.match(result.problems[0].message, /번호 001 가/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("current.md에 적힌 워크스트림 폴더가 없으면 잡는다", () => {
  const dir = project((d) => listCurrent(d, "999-ghost"));
  try {
    const result = check(dir);
    // 폴더가 없으니 current.md 가 가리키는 두 경로도 함께 끊긴다.
    assert.ok(
      result.problems.some((f) => /999-ghost 이 적혀 있는데 그 폴더가 없습니다/.test(f.message)),
      messages(result)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("current.md의 주석 속 작성 예시는 적힌 것으로 세지 않는다", () => {
  const dir = project((d) =>
    writeFileSync(
      join(d, ".agents/plans/current.md"),
      "# 현재 대작업\n\n<!-- 예) - **004-search-rework** -->\n\n현재 진행 중인 워크스트림은 없습니다.\n"
    )
  );
  try {
    assert.deepEqual(check(dir).problems, [], messages(check(dir)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("대작업이 동시에 여러 개여도 모두 적혀 있으면 통과한다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "004-search-rework");
    makeWorkstream(d, "005-i18n-docs");
    listCurrent(d, "004-search-rework", "005-i18n-docs");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 0, messages(result));
    assert.ok(
      result.passed.some((p) => p.includes("진행 중인 대작업 2개")),
      result.passed.join(", ")
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("동시에 여러 개일 때 하나만 빠져 있으면 그 하나만 잡는다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "004-search-rework");
    makeWorkstream(d, "005-i18n-docs");
    listCurrent(d, "004-search-rework");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1, messages(result));
    assert.match(result.problems[0].message, /005-i18n-docs 이 없어/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 자리표시자와 아카이브

test("채우기 자리를 다 채우면 통과에 들어간다", () => {
  const dir = project((d) => {
    for (const file of [
      "AGENTS.md",
      ".agents/project.md",
      ".agents/plans/README.md",
      ".agents/plans/current.md",
      ".agents/plans/workstreams.md",
      ".agents/plans/history.md",
      ".agents/plans/ideas.md",
      ".agents/rules/verification.md",
      ".agents/rules/communication.md",
    ]) {
      const path = join(d, file);
      writeFileSync(path, readFileSync(path, "utf8").replace(/채우기|고르기|확인 필요/g, "정함"));
    }
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.ok(result.passed.includes("채우기·고르기·확인 필요 자리 없음"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("절차를 설명하는 문장 속 낱말은 자리표시자로 세지 않는다", () => {
  const dir = project();
  try {
    const before = check(dir).notices.length;
    appendFileSync(
      join(dir, "AGENTS.md"),
      "\n남은 채우기 자리는 고르기 표시와 함께 봅니다. 확인 필요도 마찬가지입니다.\n"
    );
    assert.equal(check(dir).notices.length, before, messages(check(dir)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("활성 문서에서 표식 모양을 인용해도 자리표시자로 세지 않는다", () => {
  const dir = project();
  try {
    const before = check(dir).notices.length;
    appendFileSync(
      join(dir, ".agents/rules/communication.md"),
      "\n실제 자리는 `<!-- 채우기: 무엇을 -->` 형태입니다.\n"
    );
    const after = check(dir);
    assert.equal(after.notices.length, before, messages(after));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("아카이브는 자리표시자를 세지 않고, 끊긴 경로도 확인으로만 본다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-old");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 지난 대작업\n");
    writeFileSync(
      join(path, "status.md"),
      "# 상태\n\n<!-- 채우기: 그때 채우던 자리 -->\n\n당시에는 `.agents/plans/gone.md` 를 보고 있었습니다.\n"
    );
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.match(messages(result), /가리키는 .agents\/plans\/gone.md 가 지금은 없습니다/);
    assert.ok(
      !result.notices.some((f) => f.where.includes("001-old") && f.message.includes("채우지 않은")),
      messages(result)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("아카이브에 끊긴 경로가 있으면 통과 문구가 그 사실을 밝힌다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-old");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 지난 대작업\n");
    writeFileSync(join(path, "status.md"), "# 상태\n\n당시에는 `.agents/plans/gone.md` 를 보고 있었습니다.\n");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    const line = result.passed.find((p) => p.includes("가리키는 경로"));
    assert.ok(line, result.passed.join(", "));
    assert.match(line, /활성 문서가 가리키는 경로 \d+곳 \(아카이브 1곳은 아래 확인\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("적용을 마치고 지운 `.cairn` 을 세팅 기록이 가리켜도 문제가 아니다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-cairn-setup");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업: cairn 구조 적용\n");
    writeFileSync(join(path, "status.md"), "`.cairn/APPLY.md` 5단계의 문구를 정리했습니다.\n");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 진입점

test("AGENTS.md가 .agents/로 안내하지 않으면 잡는다", () => {
  const dir = project((d) => writeFileSync(join(d, "AGENTS.md"), "# 프로젝트\n\n규칙만 여기 적었다.\n"));
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /아무도 읽지 않습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("주석 속 @AGENTS.md는 연결로 보지 않는다", () => {
  const dir = project((d) =>
    writeFileSync(join(d, "CLAUDE.md"), "<!-- @AGENTS.md -->\n\n여기 규칙을 직접 적었다.\n")
  );
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /AGENTS.md로 이어지지 않습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLAUDE.md에 본문이 섞여 있으면 문제로 잡는다", () => {
  const dir = project((d) =>
    writeFileSync(join(d, "CLAUDE.md"), "@AGENTS.md\n\n추가로 여기에만 적은 규칙이 있다.\n")
  );
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /한 줄이 아닙니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("문제가 있으면 종료 코드 1로 끝낸다", () => {
  const dir = project((d) => writeFileSync(join(d, "CLAUDE.md"), "빈 파일\n"));
  try {
    assert.throws(
      () => execFileSync(process.execPath, [join(ROOT, "bin/cairn.mjs"), "check", dir], { encoding: "utf8" }),
      (error) => error.status === 1 && /AGENTS.md로 이어지지 않습니다/.test(error.stdout)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 적용이 진행 중일 때 검사기가 자기 한계를 알리는지 본다.

test("세팅 워크스트림이 활성이면 골격 참조 검사의 한계를 알린다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "001-cairn-setup");
    listCurrent(d, "001-cairn-setup");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    const hit = result.notices.find((f) => /적용이 진행 중입니다/.test(f.message));
    assert.ok(hit, messages(result));
    assert.match(hit.message, /`\.cairn` 만 봅니다/);
    assert.equal(hit.where, ".agents/plans/workstreams/001-cairn-setup");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("세팅 워크스트림이 없으면 그 안내를 내지 않는다", () => {
  const dir = project((d) => {
    makeWorkstream(d, "004-search-rework");
    listCurrent(d, "004-search-rework");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.ok(
      !result.notices.some((f) => /적용이 진행 중입니다/.test(f.message)),
      messages(result)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("아카이브로 옮긴 세팅 워크스트림은 그 안내를 내지 않는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-cairn-setup");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업: cairn 구조 적용\n");
    writeFileSync(join(path, "status.md"), "# 상태\n");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.ok(
      !result.notices.some((f) => /적용이 진행 중입니다/.test(f.message)),
      messages(result)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
