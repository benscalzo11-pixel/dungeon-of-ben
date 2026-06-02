# Dungeon of Vim

Dungeon of Vim is a free browser game that teaches Vim through gameplay. The
theme is prison break / dungeon escape: the player starts trapped inside a
single Vim-like terminal window and learns commands naturally while trying to
escape.

This is the initial Day 1 skeleton. It uses Vite, React, and TypeScript with no
backend, auth, database, router, styling framework, Canvas, or game engine.

## Local Development

Install dependencies:

```sh
npm install
```

Run the local dev server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Run TypeScript checks:

```sh
npm run typecheck
```

## Current Controls

- `Enter` starts the game.
- `h` moves left.
- `j` moves down.
- `k` moves up.
- `l` moves right.
- `?` toggles help.
- `:` opens command input.
- `Escape` leaves command input.

Current placeholder commands:

- `:w` shows `Game saved.`
- `:q` shows `The door is still locked.`
- `:e intro` shows the intro text.
- `:telnet level2` triggers a joke trap because telnet is insecure.

## Day 1 Scope

- Full-screen terminal-themed layout.
- Static title screen.
- Three-panel Vim-like game screen.
- Tiny static prison map.
- Basic keyboard movement.
- Simple command parser.
- Beginner-friendly React state.

## Future Ideas

- Unlock `tmux` in the mid game.
- Unlock `bash` in the late game.
- Use SSH as the world-map travel mechanic.
- Let keys matter with commands like `ssh -i <key> level2@dungeon`.
- Make the network the world map.
- Add the `sudo` spell as the final power.
- Make `:q` the final escape mechanic after milestones.
- Add progressive command unlocks and lots of help.
- Keep puzzles bypassable with commands like `:e intro`.
- Prepare story, help, and dialogue text for localization.
