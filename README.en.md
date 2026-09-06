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
    workstreams/<number>-<name>/  one folder per piece of work spanning days
```

The skeleton is markdown files only. There is one `cairn init` command that
creates a new folder for you, but you never have to use it — copying gets you
the same result.

The documents are written in Korean. Translate them if you work in another
language — the structure doesn't depend on the language.

## Getting started

### A brand-new project

Needs Node 18 or later and Git; nothing to install.

```bash
npx --yes github:Jammanb0/cairn init my-project
cd my-project
```

That builds the whole skeleton — shared rules and planning documents. There are
no existing rules to carry over, so no setup workstream is created.

The project name is filled in; the project-specific blanks, like your stack and
verification commands, come next. To find what's left:

```bash
grep -rnE "채우기|고르기" AGENTS.md .agents/
```

(Those Korean markers mean "fill in" and "choose one".) You can hand it to an
agent instead:

```text
Fill in the 채우기 (fill-in) spots in AGENTS.md and .agents/ for this project.
Don't invent anything you can't confirm — mark it as 확인 필요 (needs checking).
```

### A project you're already working on

Don't drop the files into your project. Clone it beside your work as one folder.
Nothing you already have is touched.

```bash
git clone --depth 1 https://github.com/Jammanb0/cairn .cairn
```

Then ask Claude Code or Codex:

```text
Read .cairn/APPLY.md and apply it to this project.
Preserve the existing rules and records, and show me the changes to the
instruction files before applying them.
```

The agent surveys your existing rules and records and shows you the plan first.
Once you approve, it creates a "cairn setup" workstream inside your project and
carries everything over there; when that finishes, it archives the workstream
and cleans up `.cairn/`.

Commits happen along the way, so the agent adds `.cairn/` to `.gitignore`
temporarily and removes just that line when it is done.

**Copying the files is not the same as applying them.** If you leave your
existing `AGENTS.md` alone and only add `.agents/`, nothing tells anyone to read
that folder, so nobody does. That's why `APPLY.md` is built around carrying
things over and wiring them up rather than copying. Existing rules stay; where
they clash with the skeleton, it stops and asks you instead of deciding on its
own.

Applying cairn is treated as a piece of work in its own right, so if it stops
halfway, where you got to is written down in that workstream.

### Doing it without AI

Read `.cairn/APPLY.md` and `.cairn/setup-workstream/workflow.md` as checklists
and follow them in order. The work is the same either way.

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

Checked with Claude Code 2.1.234 and Codex desktop against throwaway projects.
Verdicts come from the actual file state, `git log`, and the tool-call log, not
from what the agent said it did. Starting conditions, pass criteria, and results
are in [`docs/trials/README.md`](docs/trials/README.md) (Korean).

Confirmed:

- `cairn init` produces documents identical to `template/`, and changes nothing
  and stops when the target folder already has files (Node 18 and 22)
- **The setup-workstream flow end to end, in a local repository with no
  remote** — for a project with an existing `AGENTS.md` and `TODO.md`, and for
  one with body content in `CLAUDE.md`: bootstrap commit, carrying everything
  over, archiving the setup workstream, merging into the target branch, and
  deleting the work branch
- No writes before approval, existing rules kept, clashes raised as questions
- Cleanup stops and keeps `.cairn/` when the pre-delete check fails
- After applying, a fresh session finds and reads `.agents/plans/workflow.md`
  on its own and reports what's in progress — in both Claude Code and Codex

Partly confirmed:

- Choosing not to commit `.agents/` — checked through bootstrap and picking the
  work back up, but not carrying over, finishing, or archiving in that state
- A root `workflow.md` in a format other than cairn's — checked only as far as
  preserving the existing format and adding the pointer line

Not verified yet:

- **Applying, merging, and cleanup in Codex.** Only document discovery was
  confirmed there
- Landing the work when a remote exists — remote work branch, PR, remote merge
- Projects with several workstreams at once
- Operating systems other than Windows

If something doesn't hold up in practice, please open an issue.
