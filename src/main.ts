import './style.css'

type Tile = 'wall' | 'floor' | 'exit'
type Position = { x: number; y: number }

const mapRows = [
  '###################',
  '#@....#.....#.....#',
  '###.#.#.###.#.###.#',
  '#...#...#...#...#.#',
  '#.#######.#####.#.#',
  '#.......#.....#.#.#',
  '#.#####.#####.#.#.#',
  '#.#...#.....#.#...#',
  '#.#.#.#####.#.###.#',
  '#...#.....#...#...>',
  '###################',
]

const commandHints = ['w', 'dd', 'ciw', ':%s/shadow/light/g', ':wq']
const pickups = new Map<string, string>([
  ['5,1', 'w'],
  ['10,3', 'dd'],
  ['2,5', 'ciw'],
  ['8,7', ':%s'],
  ['16,9', ':wq'],
])

const initialPlayer = findPlayer(mapRows)
let player: Position = { ...initialPlayer }
let steps = 0
let focus = 0
let mode: 'normal' | 'insert' | 'command' = 'normal'
let log = 'NORMAL'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

app.innerHTML = `
  <main class="shell" aria-label="Dungeon of Vim">
    <section class="titlebar">
      <div>
        <p class="eyebrow">Dungeon of Vim</p>
        <h1>Escape by editing the maze.</h1>
      </div>
      <div class="stats" aria-label="Run stats">
        <span id="mode">NORMAL</span>
        <span id="steps">0 moves</span>
        <span id="focus">0/5 marks</span>
      </div>
    </section>
    <section class="gameboard">
      <div id="map" class="map" aria-live="polite"></div>
      <aside class="panel" aria-label="Command buffer">
        <div class="buffer-head">
          <span>buffer://dungeon.vim</span>
          <span id="cursor">1,2</span>
        </div>
        <ol id="commands"></ol>
        <div id="log" class="log">NORMAL</div>
      </aside>
    </section>
  </main>
`

const map = document.querySelector<HTMLDivElement>('#map')!
const modeEl = document.querySelector<HTMLSpanElement>('#mode')!
const stepsEl = document.querySelector<HTMLSpanElement>('#steps')!
const focusEl = document.querySelector<HTMLSpanElement>('#focus')!
const cursorEl = document.querySelector<HTMLSpanElement>('#cursor')!
const commandList = document.querySelector<HTMLOListElement>('#commands')!
const logEl = document.querySelector<HTMLDivElement>('#log')!

render()

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()

  if (key === 'escape') {
    mode = 'normal'
    log = 'NORMAL'
    render()
    return
  }

  if (key === 'i') {
    mode = 'insert'
    log = '-- INSERT --'
    render()
    return
  }

  if (key === ':') {
    mode = 'command'
    log = ':'
    render()
    return
  }

  const movement: Record<string, Position> = {
    arrowleft: { x: -1, y: 0 },
    h: { x: -1, y: 0 },
    arrowdown: { x: 0, y: 1 },
    j: { x: 0, y: 1 },
    arrowup: { x: 0, y: -1 },
    k: { x: 0, y: -1 },
    arrowright: { x: 1, y: 0 },
    l: { x: 1, y: 0 },
  }

  const direction = movement[key]
  if (!direction) return

  event.preventDefault()
  move(direction)
})

function move(direction: Position) {
  const next = { x: player.x + direction.x, y: player.y + direction.y }
  const tile = getTile(next)

  if (tile === 'wall') {
    log = 'E486: Pattern not found: passage'
    render()
    return
  }

  player = next
  steps += 1

  const pickupKey = `${player.x},${player.y}`
  if (pickups.has(pickupKey)) {
    focus += 1
    log = `Yanked mark: ${pickups.get(pickupKey)}`
    pickups.delete(pickupKey)
  } else if (tile === 'exit') {
    log = focus === commandHints.length ? ':wq complete' : 'E37: No write since last change'
  } else {
    log = mode === 'normal' ? 'NORMAL' : mode === 'insert' ? '-- INSERT --' : ':'
  }

  render()
}

function render() {
  const tiles = mapRows.flatMap((row, y) =>
    [...row].map((cell, x) => {
      const positionKey = `${x},${y}`
      const isPlayer = player.x === x && player.y === y
      const tile = normalizeTile(cell)
      const content = isPlayer ? '@' : pickups.get(positionKey) ? '*' : cell === '>' ? '>' : ''
      const classes = ['tile', tile, isPlayer ? 'player' : '', pickups.has(positionKey) ? 'mark' : '']
        .filter(Boolean)
        .join(' ')

      return `<span class="${classes}" aria-label="${tile}">${content}</span>`
    }),
  )

  map.innerHTML = tiles.join('')
  modeEl.textContent = mode.toUpperCase()
  stepsEl.textContent = `${steps} moves`
  focusEl.textContent = `${focus}/${commandHints.length} marks`
  cursorEl.textContent = `${player.y + 1},${player.x + 1}`
  logEl.textContent = log
  commandList.innerHTML = commandHints
    .map((command, index) => `<li class="${index < focus ? 'complete' : ''}">${command}</li>`)
    .join('')
}

function findPlayer(rows: string[]): Position {
  for (const [y, row] of rows.entries()) {
    const x = row.indexOf('@')
    if (x >= 0) return { x, y }
  }

  return { x: 1, y: 1 }
}

function getTile(position: Position): Tile {
  return normalizeTile(mapRows[position.y]?.[position.x] ?? '#')
}

function normalizeTile(cell: string): Tile {
  if (cell === '#') return 'wall'
  if (cell === '>') return 'exit'
  return 'floor'
}
