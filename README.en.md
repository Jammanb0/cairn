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

### Using Codex or Claude Code desktop

The `npx` and `git clone` commands above only put the cairn files in your
project. Run them in the app terminal or a regular terminal, then open the
project folder in Codex or Claude Code desktop.

- In a new project, Codex reads `AGENTS.md`, while Claude Code follows
  `@AGENTS.md` from `CLAUDE.md` to the same rules. Ask it to fill in the
  project-specific blanks.
- In an existing project, open the folder and use the `.cairn/APPLY.md` prompt
  above.
- A regular chat without access to your local project files cannot apply the
  structure automatically.

### Doing it without AI

Read `.cairn/APPLY.md` and `.cairn/setup-workstream/workflow.md` as checklists
and follow them in order. The work is the same either way.

## Larger work and branches

There is no default place to work for a workstream. At the start, cairn asks
whether to work directly on the branch you want or create a separate local work
branch.

If you choose a local work branch, it then asks which branch to start from,
which branch should receive the result, and whether to leave a remote work branch
and PR record. The work location, base branch, target branch, and remote-work
record choice are written into the plan so the next session continues the same
way.

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
