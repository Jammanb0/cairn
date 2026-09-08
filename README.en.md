<div align="center">

# cairn

**Make your AI agent remember what you were in the middle of yesterday.**

One source of rules in `AGENTS.md`. One place for progress.
Codex and Claude Code read the same file.

[![test](https://github.com/Jammanb0/cairn/actions/workflows/test.yml/badge.svg)](https://github.com/Jammanb0/cairn/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen.svg)](package.json)

[한국어](README.md) · [Trial records](docs/trials/README.md) · [Adoption guide](APPLY.md)

</div>

---

## Sound familiar

```text
You: let's pick up where we left off yesterday
AI:  Could you tell me which task you're referring to?
You: ...
```

```text
You: I told you to ask before committing
AI:  There's no such rule in CLAUDE.md
You: I wrote it in AGENTS.md
```

**With cairn applied**

```text
You: what was I working on?
AI:  The 002-length-limit workstream is in progress.
     The checker landed yesterday; next is the template.
     Working branch is workstream/002-length-limit, merging into main.
```

The [trial records](docs/trials/README.md) document how this was actually
tested — including what has **not** been verified.

## Get started in five minutes

**New project**

```bash
npx --yes github:Jammanb0/cairn init my-project
```

**Project already in flight** — nothing you have is touched

```bash
git clone --depth 1 https://github.com/Jammanb0/cairn .cairn
```

Paste this to your agent.

```text
Read .cairn/APPLY.md and apply it to this project.
Preserve the existing rules and notes, and show me any change to an
instruction file before you make it.
```

**Check it worked**

```bash
npx --yes github:Jammanb0/cairn check .
```

## Rules live in exactly one place

Each tool reads its own file. Codex reads `AGENTS.md`, Claude Code reads
`CLAUDE.md`. So you end up writing the same rules twice, and fixing one side
splits them.

Make `CLAUDE.md` a one-line signpost and both tools read the same file.

```text
  Codex  ────────────────────────────┐
                                     ├──►  AGENTS.md  ──►  .agents/
  Claude Code  ──►  CLAUDE.md  ──────┘     rule source      detailed rules
                    "@AGENTS.md"                            and progress
                    that one line is all of it
```

One source, so there is no generation step and nothing to drift out of sync.

## Work worth tracking gets its own folder

Anything worth tracking on its own gets a folder. A fresh session only has to
read that folder to know where things stand.

```text
  Starting     .agents/plans/workstreams/002-length-limit/
                  README.md     what this is and why
                  status.md     how far it got, what comes next
                  plan.md       the order of the work (only when useful)

  Finished     .agents/archive/workstreams/002-length-limit/
                  moved once the work has landed and you say so
                  moved, not deleted; one line stays behind in history.md
```

Each file has exactly one job. `README.md` says what the work is and why;
`status.md` says how far it got. Which branch you work on and where it merges
are decided up front and written into `status.md`, so the next session doesn't
ask again.

## Why another tool

<table>
<tr><td width="33%" valign="top">

**It carries things over**

Scattered `TODO.md` files and existing rules get surveyed and moved into place. Nothing is overwritten, and conflicts go to you.

</td><td width="33%" valign="top">

**It remembers where you work**

Base branch, merge target, whether to leave a remote branch and PR — decided once and written down.

</td><td width="33%" valign="top">

**It leaves nothing behind**

No global CLI, no generation step, no background process. Markdown only.

</td></tr>
</table>

## Questions people ask

<details>
<summary><b>Can't I just keep a few notes files?</b></summary>

<br>

Honestly, yes — for many projects that's enough, and plenty of people work
exactly that way. cairn adds three things on top.

1. A **procedure for carrying over** the rules and notes you already have
2. A **command that checks** the documents actually link up (`cairn check`, exits 1 so CI can use it)
3. It records **which branch a larger piece of work lives on**

</details>

<details>
<summary><b>Does it work with Cursor or Copilot?</b></summary>

<br>

Any tool that reads `AGENTS.md` works. It does **not** convert rules into each
tool's own format — [rulesync](https://github.com/dyoshikawa/rulesync) and
[ai-rules-sync](https://github.com/PanisHandsome/ai-rules-sync) do that better.

</details>

<details>
<summary><b>How is this different from Spec Kit or OpenSpec?</b></summary>

<br>

Those cover **what to build** (requirements). cairn covers **how you work and how
far you got**. Different layers, so they don't collide.

</details>

<details>
<summary><b>Does it enforce the rules?</b></summary>

<br>

No. Leaving no hooks and no background process is the condition this tool is
built on. Instead it makes things **checkable** — `cairn check` exits 1 when the
documents stop linking up.

</details>

<details>
<summary><b>I'm on 0.1.x — what changed?</b></summary>

<br>

0.2.0 reorganizes the documents so each one has a single job, and it is **not
backwards compatible.**

```text
.agents/plans/goal.md      →  .agents/project.md
.agents/plans/workflow.md  →  .agents/plans/current.md      work in progress
                              .agents/plans/workstreams.md  how it is run
per-workstream workflow.md →  status.md / plan.md / decisions.md
```

Nothing is left behind to bridge the old paths. `cairn check` tells you what
moved where when it finds the old layout.

Leave anything already archived as it is — it records the structure of its own
time, and the checker does not report old documents inside an archive as the old
layout. It does not skip archives entirely, though: a path an archived document
points at that no longer exists is reported for review, and a duplicate
workstream number is still a problem.

</details>

<details>
<summary><b>How much of this is verified?</b></summary>

<br>

The commands (`init`, `check`) run in CI on Windows, Ubuntu and macOS against
Node 22 and 24. Tests of whether an agent actually follows the docs have only run
on Windows so far, and for Codex the work-location questions were only a partial
pass. The remote-branch/PR path hasn't been exercised yet. What's left is under
"Still to verify" in the [trial records](docs/trials/README.md).

</details>

## What's in it

```text
AGENTS.md        rules that always apply, plus a table pointing to the rest
CLAUDE.md        the single line "@AGENTS.md"
.agents/
  project.md     what the project is as a whole
  rules/         verification and communication
  plans/
    README.md       the document map and reading order
    current.md      where the work in progress lives
    workstreams.md  how tracked work is run
    history.md      one line per finished task
    ideas.md        candidates not committed to yet
    workstreams/<number>-<name>/    one folder per tracked piece of work
```

There are two commands, `init` and `check`, and **you need neither.** Copying the
files gives the same result, and you can check the links by eye.

---

<div align="center">

A cairn is a stack of stones left along a mountain trail.<br>
It doesn't make the path for you, but it tells the next person — or you, coming back — how far things got.<br>
You don't knock down the ones you passed, either. Leaving them standing is what shows how far you've walked.

**MIT**

</div>
