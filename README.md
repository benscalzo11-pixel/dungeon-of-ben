# Dungeon of Ben

Dungeon of Ben is a free browser game that teaches Vim through gameplay. The
theme is a corrupted terminal: the player starts trapped in a glitched shell-like
terminal and learns commands naturally while trying to escape.

## Story and onboarding

You begin at a terminal title screen called **Dungeon of Ben: The Escape Protocol**.

- The title screen introduces a stronger opening premise.
- Press any key to advance from title to the short intro screen.
- Intro sequence includes the text:
  - `Prison Block 0`
  - `You awaken inside a flickering terminal shell.`
  - `The guards are gone.`
  - `A giant mouse blocks the only exit.`
  - `Rumors speak of ancient powers: Vim, tmux, bash, sudo.`

## Help and immersion

The side panel now teaches players:

- Movement keys and their purpose (`h j k l`).
- Command mode flow (`:` to open, Enter to run, Escape to return).
- An objective panel showing current and future goals.
- A beginner-friendly Vim philosophy summary: small, intentional actions.

Future progression message text is prepared:

- `Mouse defeated.`
- `Door unlocked.`
- `First escape.`
- `Discovering tmux.`
- `Discovering bash.`
- `Discovering ssh.`

This is the initial Day 1 skeleton. It uses Vite, React, and TypeScript with no
backend, auth, database, router, styling framework, Canvas, or game engine.

## Local Development

Install dependencies:

```sh
make install
```

Run the local dev server:

```sh
make dev
```

Stop the local dev server:

```sh
make down
```

When running inside a virtual machine, open the VM network URL from your host
machine. For example:

```text
http://192.168.64.12:5173/
```

Build for production:

```sh
make build
```

Run TypeScript checks:

```sh
make typecheck
```

## Current Controls

- Press any key to advance from title screen to intro, and then from intro into gameplay.
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

- Full-screen corrupted-terminal layout with unstable terminal visual states.
- Static title screen.
- Three-panel Vim-like game screen.
- Tiny static terminal-grid map.
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
