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

## Getting it

### Starting something new

If you're starting from an empty folder, one line builds the skeleton. Needs
Node 18 or later and Git; nothing to install.

```bash
npx --yes github:Jammanb0/cairn init my-project
```

That creates `my-project/` with `AGENTS.md`, `CLAUDE.md`, and `.agents/`. It
fills in the project name and leaves every other `<!-- 채우기: -->` (fill in)
marker alone. If the target folder already has files in it, it changes nothing
and stops.

That's the skeleton built; the project-specific blanks come next. To find
what's left:

```bash
cd my-project
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
starting fresh, the `cairn init` line above builds the skeleton and you can
skip this section.

The procedure lives in [`APPLY.md`](APPLY.md). Hand it to an agent, or read it
and do the steps yourself.

To hand it to an agent:

```text
Read .cairn/APPLY.md and apply it to this project.
Preserve the existing rules and records, and show me the changes to the
instruction files before applying them.
```

Doing it by hand: follow `APPLY.md` in order.

`APPLY.md` takes you through surveying the project, asking what needs asking,
and creating a "cairn setup" workstream inside it. The actual carrying-over and
wiring-up lives in that workstream's `workflow.md`. Applying cairn is treated
as a piece of work in its own right, so if it stops halfway, where you got to
is written down.

When it's done, archive that workstream and delete the `.cairn/` folder.

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

Checked with Claude Code 2.1.234 and Codex desktop against throwaway projects.
Verdicts come from the actual file state and the tool-call log, not from what
the agent said it did. Starting conditions, pass criteria, and results are in
[`docs/trials/README.md`](docs/trials/README.md) (Korean).

Confirmed:

- `cairn init` produces documents identical to `template/`, and changes nothing
  and stops when the target folder already has files (Node 18 and 22)
- Applying to a project that already has instruction files and records: no
  writes before approval, existing rules kept, clashes raised as questions.
  **This was checked against the direct apply procedure that preceded the setup
  workstream**
- Cleanup stops and keeps `.cairn/` when the pre-delete check fails (same
  point in time)
- After applying, a fresh session finds and reads `.agents/plans/workflow.md`
  on its own and reports what's in progress — in both Claude Code and Codex

Not verified yet:

- **The current setup-workstream flow end to end.** Bootstrap, carrying over,
  finishing, archiving — none of it has been run. The paths for a project that
  does not commit `.agents/`, a root `workflow.md` in a different format, and a
  `CLAUDE.md` with body content exist only on paper
- **Applying and cleanup in Codex.** Only document discovery was confirmed there
- Projects with several workstreams at once, or an established document system
  of their own
- The long-run flow of finishing a workstream and moving it to the archive
- Operating systems other than Windows

If something doesn't hold up in practice, please open an issue.
