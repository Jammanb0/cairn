import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { check } from "../lib/check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 골격을 복사한 임시 프로젝트를 만든다. 테스트마다 독립이다.
function project(setup) {
  const dir = mkdtempSync(join(tmpdir(), "cairn-test-"));
  cpSync(join(ROOT, "template"), dir, { recursive: true });
  if (setup) setup(dir);
  return dir;
}

// 루트 workflow.md 의 「현재 대작업」에 이 워크스트림을 적는다.
function listCurrent(dir, name) {
  writeFileSync(
    join(dir, ".agents/plans/workflow.md"),
    `# 전체 작업 흐름

## 현재 대작업

- **${name}**
  - 문서: .agents/plans/workstreams/${name}/
`
  );
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
    appendFileSync(join(d, "AGENTS.md"), "\n해당 대작업의 `workflow.md`와 `design.md`를 봅니다.\n")
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

test("워크스트림 번호가 겹치면 잡는다", () => {
  const dir = project((d) => {
    listCurrent(d, "001-first");
    for (const path of [
      ".agents/plans/workstreams/001-first",
      ".agents/archive/workstreams/001-second",
    ]) {
      mkdirSync(join(d, path), { recursive: true });
      writeFileSync(join(d, path, "README.md"), "# 대작업\n");
      writeFileSync(join(d, path, "workflow.md"), "# 진행\n");
    }
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /번호 001 가/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("워크스트림에 workflow.md가 없고 루트에도 안 적혔으면 둘 다 잡는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/plans/workstreams/002-cli-command");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 2, messages(result));
    assert.match(messages(result), /workflow\.md 가 없습니다/);
    assert.match(messages(result), /「현재 대작업」에 002-cli-command 이 없어/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("채우기 자리를 다 채우면 통과에 들어간다", () => {
  const dir = project((d) => {
    for (const file of [
      "AGENTS.md",
      ".agents/plans/goal.md",
      ".agents/plans/history.md",
      ".agents/plans/workflow.md",
      ".agents/rules/verification.md",
      ".agents/rules/communication.md",
      ".agents/plans/README.md",
      ".agents/plans/ideas.md",
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

// 아래는 검토에서 나온 누락을 고치고 다시 나지 않게 고정한 것이다.

test("적용을 마치고 지운 `.cairn` 을 세팅 기록이 가리켜도 문제가 아니다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/archive/workstreams/001-cairn-setup");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업: cairn 구조 적용\n");
    writeFileSync(join(path, "workflow.md"), "`.cairn/APPLY.md` 5단계의 문구를 정리했습니다.\n");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

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

test("「현재 대작업」에 적힌 워크스트림 폴더가 없으면 잡는다", () => {
  const dir = project((d) =>
    writeFileSync(
      join(d, ".agents/plans/workflow.md"),
      "# 전체 작업 흐름\n\n## 현재 대작업\n\n- **999 유령**\n  - 문서: `.agents/plans/workstreams/999-ghost/`\n\n## 대작업 관리 흐름\n\n1. 어쩌고\n"
    )
  );
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /999-ghost 이 적혀 있는데 그 폴더가 없습니다/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("다른 절에만 이름이 있으면 「현재 대작업」에 없다고 잡는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/plans/workstreams/002-cli-command");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
    writeFileSync(join(path, "workflow.md"), "# 진행\n");
    writeFileSync(
      join(d, ".agents/plans/workflow.md"),
      "# 전체 작업 흐름\n\n## 현재 대작업\n\n현재 진행 중인 워크스트림은 없습니다.\n\n## 멈춘 대작업\n\n- 002-cli-command 는 잠시 멈췄습니다.\n"
    );
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /「현재 대작업」에 002-cli-command 이 없어/);
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

test("「현재 대작업」 절이 없으면 대조하지 못했다고 알리고 통과로 적지 않는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/plans/workstreams/002-cli-command");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
    writeFileSync(join(path, "workflow.md"), "# 진행\n");
    writeFileSync(join(d, ".agents/plans/workflow.md"), "# 전체 작업 흐름\n\n## 대작업 관리 흐름\n\n1. 어쩌고\n");
  });
  try {
    const result = check(dir);
    assert.deepEqual(result.problems, [], messages(result));
    assert.match(messages(result), /대조하지 못했습니다/);
    assert.ok(!result.passed.some((p) => p.includes("진행 중인 대작업")), result.passed.join(", "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("루트에 적히지 않은 대작업은 통과로 적지 않는다", () => {
  const dir = project((d) => {
    const path = join(d, ".agents/plans/workstreams/002-cli-command");
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "README.md"), "# 대작업\n");
    writeFileSync(join(path, "workflow.md"), "# 진행\n");
    writeFileSync(join(d, ".agents/plans/workflow.md"), "# 전체 작업 흐름\n\n## 현재 대작업\n\n현재 진행 중인 워크스트림은 없습니다.\n");
  });
  try {
    const result = check(dir);
    assert.equal(result.problems.length, 1);
    assert.match(result.problems[0].message, /「현재 대작업」에 002-cli-command 이 없어/);
    assert.ok(!result.passed.some((p) => p.includes("진행 중인 대작업")), result.passed.join(", "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
