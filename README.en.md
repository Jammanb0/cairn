# cairn

[한국어](README.md)

A markdown skeleton that keeps rules and context from scattering while you work
with AI coding agents.

A cairn is a stack of stones left along a mountain trail. It doesn't make the
path for you, but it tells the next person — or you, coming back — how far
things got.

## What it solves

Two things keep happening when you work with an agent over several days.

- Rules scatter. Codex reads `AGENTS.md`, Claude Code reads `CLAUDE.md`, so you
  end up writing the same rules twice, and fixing only one side splits them.
- Context disappears. Every new session starts with explaining what you were in
  the middle of.

This skeleton keeps the single source of rules in `AGENTS.md`, points
`CLAUDE.md` at it, and tracks progress in one place under `.agents/plans/`.

## What's in it

```text
AGENTS.md              rules that always apply, plus a table pointing at the rest
CLAUDE.md              one line: "@AGENTS.md"
.agents/
  rules/
    verification.md    how to check before you say you're done
    communication.md   how to write answers
  plans/
    README.md          how these planning documents are structured
    goal.md            purpose, scope, what you decided not to do
    workflow.md        what you're working on now and what's next
    history.md         a short index of finished work
    ideas.md           candidates you haven't committed to yet
    workstreams/<name>/  one folder per piece of work that spans several days
```

The skeleton is markdown files only. There is one `cairn init` command that
creates a new folder for you, but you never have to use it — copying gets you
the same result.

The documents are written in Korean. Translate them if you work in another
language — the structure doesn't depend on the language.

## Getting it

### Starting something new

If you're starting from an empty folder, one line does it. Needs Node 18 or
later; nothing to install.

```bash
npx github:Jammanb0/cairn init my-project
```

That creates `my-project/` with `AGENTS.md`, `CLAUDE.md`, and `.agents/`. It
fills in the project name and leaves every other `<!-- 채우기: -->` (fill in)
marker alone. If the target folder already has files in it, it changes nothing
and stops.

To find what's left to fill in:

```bash
grep -rnE "채우기|고르기" AGENTS.md .agents/
```

### Adding it to a project you're already working on

Don't drop the files into your project. Clone it beside your work as one folder.
Nothing you already have is touched.

```bash
git clone --depth 1 https://github.com/Jammanb0/cairn .cairn
```

You may want to commit while applying it, so add `.cairn/` to `.gitignore`
first. Cleaning up afterwards is covered by "Cleanup" in `APPLY.md`.
## Applying it

Applying means adding this to a project you are already working on. If you are
starting fresh, the `cairn init` line above is the whole story and you can skip
this section.

The procedure lives in [`APPLY.md`](APPLY.md). Hand it to an agent, or read it
and do the steps yourself.

To hand it to an agent:

```text
Read .cairn/APPLY.md and apply it to this project.
Preserve the existing rules and records, and show me the changes to the
instruction files before applying them.
```

Doing it by hand: follow `APPLY.md` in order. Carrying the existing documents
over and wiring them up is the part that matters.

When it's done, delete the `.cairn/` folder.

## What to watch out for in an existing project

**Copying the files is not the same as applying them.** If you leave your
existing `AGENTS.md` alone and only add `.agents/`, nothing tells anyone to read
that folder, so nobody does. The files exist and nothing happens.

That's why `APPLY.md` is built around carrying things over and wiring them up
rather than copying. Existing rules stay; where they clash with the skeleton, it
stops and asks you instead of deciding on its own.

## What you can change

These parts of `AGENTS.md` are defaults. Change them to suit your team.

- Response language
- What needs approval before work starts
- How commits and pushes are approved, and the language and format of commit
  messages

Spots that differ per project — the test and build commands in
`verification.md`, for instance — are left as `<!-- 채우기: -->` markers. The
rest of the principles can be used as they are.

## Scope

You can use this without AI. It's markdown, so you can read and maintain it
yourself. But it was built for the problem of rules and context scattering when
you work with an agent, and that's where it earns its keep.

It isn't tied to one tool. Anything that reads `AGENTS.md` and `CLAUDE.md`
works.

## How far this has been verified

Checked with Claude Code 2.1.234 against throwaway projects. Verdicts come from
the actual file state and the tool-call log, not from what the agent said it
did.

**`cairn init`** — run straight from GitHub with
`npx github:Jammanb0/cairn init`.

- The generated documents are identical to `template/`; the only difference is
  the project-name line
- With files already in the target folder it changes nothing, stops, and points
  at the procedure for existing projects. An empty folder is used as-is
- Given no folder name it prints usage and stops
- A name containing replacement syntax such as `$&` does not corrupt the title

**Applying to a project with records but no instruction files** — `README.md`,
`TODO.md`, two commits.

- Step 0 of `APPLY.md` routed it as an existing project
- It proposed changes and stopped to ask instead of copying
- The in-progress, finished, and someday sections of `TODO.md` went to a
  workstream, `history.md`, and `ideas.md` respectively

**Applying to a project that already had `AGENTS.md` and `.agents/`** — seeded
with rules that clash with the skeleton's defaults (response language, commit
approval, commit message format).

- Zero file writes before approval
- It asked about all four clashes rather than deciding
- After approval, every existing rule and record survived, in its new place
- It asked before deleting the original record file

**Applying to a project with body content in `CLAUDE.md`**

- Zero file writes before approval
- Constraints moved to "하지 않는 것" (what not to do) in `AGENTS.md`, work in
  progress moved to a workstream, and `CLAUDE.md` became the one-line import
- Anything it had no evidence for was left marked as needing confirmation
  instead of invented

**Cleanup** — with the pre-delete check forced to fail. Two of the three
projects above reached the cleanup step; the third stopped earlier, asking
whether to delete the original record file, and never got there.

- Both kept `.cairn/` instead of deleting it, including an edit left inside the
  folder
- Both reported that they could not confirm

**Finding the documents afterwards** — a fresh session with no context, asked
only "what was I in the middle of?", read `.agents/plans/workflow.md`, then the
workstream's `workflow.md`, then `goal.md`, and answered correctly.

The same was confirmed separately in Codex desktop. Told not to consult Git
history and to read only the current files, it found and read `AGENTS.md`,
`.agents/plans/workflow.md`, and the workstream's `workflow.md` on its own,
and named the work in progress and what was left. It was not told where the
documents were.

Not verified yet:

- **Applying and cleanup in Codex.** The application and cleanup runs above were
  all Claude Code; only document discovery was confirmed in Codex
- Projects with several workstreams at once, or an established document system
  of their own
- The long-run flow of finishing a workstream and moving it to the archive

If something doesn't hold up in practice, please open an issue.
