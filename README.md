# Dungeon of Vim

Dungeon of Vim is a browser roguelike about escaping a dungeon with Vim motions,
modal state, and command-line habits.

This repo is the initial playable foundation: a Vite + TypeScript browser game
with a static dungeon map, player movement, collectibles, a command buffer, and a
small HUD.

## Local Development

```sh
npm install
npm run dev
```

Build the production bundle:

```sh
npm run build
```

Preview the production bundle locally:

```sh
npm run preview
```

## Controls

- Move with `h`, `j`, `k`, `l` or arrow keys.
- Switch to insert mode with `i`.
- Open command mode with `:`.
- Return to normal mode with `Escape`.
- Collect all marks before exiting through `>`.

## Project Direction

Planned next layers:

- Procedural dungeon generation.
- Real command parsing and spell effects.
- Enemies based on editing mistakes.
- Level progression built around Vim concepts.
- Persistent runs and score history.

## License

MIT
