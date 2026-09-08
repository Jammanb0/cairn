# 문서 역할 분리 — 계획

> 어떤 순서로 무엇을 하고 각 단계를 어떻게 확인하는지 적습니다. 지금 몇
> 단계인지는 `status.md`에 있습니다.

## 선행 조건

- 다음 워크스트림 번호는 `002`입니다. `001-cairn-setup`은 아카이브에 있습니다.
- 이 저장소는 자기 자신에게 cairn을 적용해 운영하므로, 규격을 정하는 단계와 이
  저장소를 이관하는 단계가 서로를 필요로 합니다. 이관을 먼저 하고 검사기를
  그다음에 맞춥니다. 그 사이에는 `cairn check .`가 통과하지 않습니다.

## 단계

### 1. 이 저장소의 운영 문서를 옮긴다

- `.agents/plans/goal.md` → `.agents/project.md`
- `.agents/plans/workflow.md` → `current.md`와 `workstreams.md`
- `.agents/plans/README.md`를 문서 지도와 읽는 순서로 다시 쓴다
- `AGENTS.md` 안내표와 `.agents/` 설명 문단을 새 경로로 바꾼다
- `ideas.md`와 `rules/communication.md`의 옛 경로 참조를 고친다
- 이 워크스트림 폴더를 새 형식(`README.md`, `status.md`, `plan.md`,
  `decisions.md`)으로 만들고 `current.md`에 적는다

**검증** 옮긴 파일에 빠진 내용이 없는지 옛 문서와 대조합니다. 이 단계에서는
검사기가 아직 옛 규격이므로 `cairn check .`는 통과하지 않습니다.

### 2. 배포 골격을 바꾼다

`template/`을 1단계와 같은 구조로 맞춥니다. 채우기 자리를 다시 배치하고,
`workstreams/` 아래에 예시 폴더를 두지 않습니다.

**검증** `diff`로 이 저장소의 `.agents/`와 골격의 차이가 채우기 자리뿐인지
확인합니다.

### 3. 검사기를 새 규격에 맞춘다

- 필수 파일 검사: `.agents/project.md`, `plans/README.md`, `plans/current.md`,
  `plans/workstreams.md`, `plans/ideas.md`, `plans/history.md`
- 활성 워크스트림 필수 파일: `README.md`, `status.md`
- `plan.md`, `design.md`, `decisions.md`는 있을 때만 본다
- `current.md`에 적힌 워크스트림과 실제 폴더를 양방향으로 대조한다
- 옛 구조(`plans/goal.md`, `plans/workflow.md`, 워크스트림의 `workflow.md`)를
  만나면 무엇이 어디로 갔는지 알리는 문제로 잡는다
- 시험에서 잡아야 할 경우와 잡으면 안 되는 경우를 모두 고정한다

**검증** `npm test`, `node bin/cairn.mjs check template`,
`node bin/cairn.mjs check .`

### 4. 세팅 워크스트림 골격을 나눈다

`setup-workstream/workflow.md`를 성격에 따라 나눕니다.

- 골격 위치, 현재 상태, 열린 항목 → `status.md`
- 적용 절차 단계 → `plan.md`
- 어긋나는 규칙을 어느 쪽으로 정했는지 → `decisions.md`
- 배경, 범위, 완료 조건, 초기 조사 결과 → `README.md`

절차 내용 자체는 그대로 두고 문서 경로만 새 구조로 바꿉니다.

**검증** 네 문서를 합쳤을 때 옛 두 문서의 내용이 빠짐없이 들어 있는지
대조합니다.

### 5. 적용 절차를 맞춘다

`APPLY.md`가 가리키는 골격 경로와 복사 명령을 4단계 결과에 맞춥니다.

**검증** `APPLY.md`에 남은 `goal.md`·`workflow.md` 참조가 없는지 검색합니다.

### 6. README 두 벌을 맞춘다

구조 그림과 설명을 새 파일 이름으로 바꿉니다. 검증되지 않은 것을 검증했다고
쓰지 않습니다.

**검증** 두 README의 구조 그림이 서로 같은 내용을 말하는지 대조합니다.

### 7. 시험 기록을 정리한다

`docs/trials/README.md`의 과거 결과는 그대로 두고, 그것이 `0.1.x` 구조를 대상으로
했다는 것을 밝힙니다. 앞으로 검증할 항목의 문서 이름만 새 구조로 바꿉니다.

**검증** 과거 시험 절의 판정과 경로가 바뀌지 않았는지 확인합니다.

### 8. 버전을 올린다

`package.json`을 `0.2.0`으로 올립니다.

**검증** `node bin/cairn.mjs --help`가 정상 동작하는지 확인합니다.

### 9. 대작업을 마친다

`workstreams.md`의 「마칠 때」를 따릅니다. `history.md`에 한 줄, `current.md`에서
제거, 폴더를 `.agents/archive/workstreams/`로 이동, 최종 커밋.

**검증** `npm test`, `check template`, `check .`를 마지막으로 다시 실행합니다.
