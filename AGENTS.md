# AGENTS.md

# Dungeon of Vim Development Guide

This file defines how AI agents and human developers work within the Dungeon of Vim repository.

All contributors should follow these rules.

---

# Project Overview

Dungeon of Vim is a browser-based game that teaches Vim through gameplay.

Theme:

- Prison break
- Dungeon escape
- Learning Vim without realizing it

Technology:

- Vite
- React
- TypeScript
- Plain CSS

Design philosophy:

- Simple
- Keyboard-first
- Easy for beginners to understand
- Fun before clever
- Learn-by-doing

The codebase should remain approachable for junior developers and students.

Avoid unnecessary complexity.

---

# Prime Directive

Make small, working, reviewable changes.

Every task should end with:

1. Code updated
2. Build passing
3. Branch created
4. Commit created
5. Branch pushed
6. Pull Request created
7. Pull Request URL reported
8. Human-readable summary provided

Never leave work half-finished.

---

# Branch Strategy

Never commit directly to `main`.

Default workflow:

```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```

Examples:

```bash
feature/help-panel
feature/player-movement
feature/inventory-system

fix/status-bar-layout
fix/player-boundary-check

docs/day-1-readme

refactor/game-command-parser
```

Branch prefixes:

- `feature/`
- `fix/`
- `docs/`
- `refactor/`
- `test/`

---

# Development Workflow

For every task:

1. Sync main
2. Create branch
3. Implement requested change
4. Run validation checks
5. Commit
6. Push
7. Create Pull Request
8. Report results

Example:

```bash
git checkout main
git pull origin main

git checkout -b feature/player-movement

# make changes

npm run build

git add .
git commit -m "Add player movement"

git push -u origin feature/player-movement

gh pr create \
  --base main \
  --title "Add player movement" \
  --body "Adds hjkl movement support."
```

---

# Repository Inspection

Before making changes:

```bash
ls

find . -maxdepth 3 -type f | sort

npm install

npm run build
```

If the build is already broken:

- Stop
- Report the issue
- Do not claim the failure was caused by your changes

---

# Validation Rules

Before committing:

Required:

```bash
npm run build
```

If available:

```bash
npm run lint
npm run typecheck
npm test
```

Do not commit code that obviously fails validation.

---

# Pull Request Rules

After every successful push:

Create a Pull Request.

Use GitHub CLI when available.

Example:

```bash
gh pr create \
  --base main \
  --title "Add Vim command parser" \
  --body "
## Summary

- Added command parser
- Added :w support
- Added :q support

## Validation

- npm run build
"
```

If authentication is required:

```bash
gh auth login
```

If a Pull Request cannot be created:

- Explain why
- Provide exact next steps

---

# Pull Request Size

Keep Pull Requests small.

Preferred:

- Under 500 lines changed

Maximum:

- Under 1,000 lines changed

If a task grows too large:

Stop and propose smaller Pull Requests.

---

# Commit Rules

One logical change per commit.

Examples:

```bash
git commit -m "Add player movement"
git commit -m "Create help panel"
git commit -m "Implement command parser"
git commit -m "Document controls"
```

Avoid:

```bash
git commit -m "stuff"
git commit -m "updates"
git commit -m "fixes"
```

Commit messages should explain intent.

---

# Coding Standards

Use:

- React
- TypeScript
- Functional components
- Plain CSS

Prefer:

- Readability
- Explicit names
- Simple state

Avoid:

- Clever abstractions
- Large frameworks
- Over-engineering
- Premature optimization

The code should be understandable by a teenager learning software development.

---

# Project Structure

Preferred structure:

```text
src/
├── components/
├── game/
├── App.tsx
├── main.tsx
└── styles.css
```

Examples:

```text
src/components/TerminalFrame.tsx
src/components/GameScreen.tsx
src/components/StatusBar.tsx
src/components/HelpPanel.tsx

src/game/map.ts
src/game/commands.ts
src/game/types.ts
```

Game logic belongs in:

```text
src/game/
```

UI belongs in:

```text
src/components/
```

---

# UX Rules

The game should feel like a terminal.

Requirements:

- Full-screen experience
- Monospace font
- Dark background
- Green or amber terminal text
- ASCII-friendly rendering
- Vim-style status bar

Do not introduce:

- Mouse-driven gameplay
- Mobile-first design
- Complex menus

Keyboard is the primary interface.

---

# Game Design Rules

Dungeon of Vim teaches Vim naturally through gameplay.

Current mechanics:

Movement:

```text
h
j
k
l
```

Help:

```text
?
```

Command mode:

```text
:
```

Supported commands:

```text
:w
:q
:e intro
```

Future mechanics:

- tmux
- bash
- ssh
- keys
- world map via network
- sudo spell

Keep current implementations simple.

Do not build future systems until requested.

---

# Story Rules

Current story arc:

Beginning:

- Trapped in Vim prison

Early Game:

- Learn movement
- Learn interaction
- Defeat "the mouse"

Mid Game:

- Unlock tmux

Late Game:

- Unlock bash

End Game:

- Earn sudo
- Escape with :q

The network eventually becomes the world map.

SSH is transportation.

Telnet is a trap.

---

# Command Rules

Commands should teach real concepts.

Examples:

```text
:w
```

Save progress.

```text
:q
```

Attempt escape.

```text
:e intro
```

Show help or lore.

```text
telnet
```

Bad outcome.

Never punish experimentation harshly except where intentionally designed.

Provide useful feedback.

---

# Localization Rules

Gameplay commands remain English.

Story text should eventually be localizable.

Use UTF-8 everywhere.

Avoid hardcoding strings where future localization is likely.

Do not build localization systems yet.

---

# Team Collaboration Rules

This repository is maintained by multiple developers.

Agents should behave like careful teammates.

Do:

- Make focused changes
- Touch only relevant files
- Explain what changed
- Explain risks
- Keep PRs small

Do not:

- Rewrite unrelated code
- Reformat entire files unnecessarily
- Introduce unrelated refactors
- Force push
- Resolve major conflicts by guessing

---

# Conflict Handling

If merge conflicts occur:

1. Stop
2. List conflicted files
3. Explain the conflict
4. Recommend resolution

Only resolve obvious conflicts automatically.

---

# Security Rules

Never:

- Commit secrets
- Commit credentials
- Commit API keys
- Commit private certificates
- Commit .env files

If configuration is required:

Use:

```text
.env.example
```

instead.

---

# Files That Must Not Be Modified

Do not modify unless explicitly instructed:

```text
.env
.env.local
.env.production
```

Never expose secrets in commits or Pull Requests.

---

# Current Scope

Allowed:

- UI improvements
- Static maps
- Movement
- Help system
- Status bar
- Command parser
- Documentation
- Small tests

Not allowed yet:

- Backend
- Authentication
- Database
- Multiplayer
- Cloudflare deployment
- Payments
- Procedural generation
- Save system
- Accounts

---

# Final Response Format

At the end of every completed task provide:

```text
Done.

Branch:
feature/example

Commit:
abc1234

Pull Request:
https://github.com/org/repo/pull/123

Checks:
- npm run build: pass
- npm run lint: pass (if available)
- npm run typecheck: pass (if available)

Changed:
- Added ...
- Updated ...
- Fixed ...

Risks:
- None

Next Suggested Task:
Implement ...
```

This format is mandatory.
