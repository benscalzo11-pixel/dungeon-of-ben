import { useEffect, useState } from 'react'
import type { LevelMeta } from '../game/levels'
import type { Position } from '../game/types'
import ObjectivePanel from './ObjectivePanel'
import StatusBar from './StatusBar'

type GameDifficulty = 'normal' | 'hard'
type PaneId = 'left' | 'right'

type TmuxSplitHallScreenProps = {
  levelMeta: LevelMeta
  difficulty: GameDifficulty
}

type TmuxTile = {
  label: string
  sprite: string
}

type SplitHallRoom = {
  name: string
  leftStart: Position
  rightStart: Position
  keyPosition: Position
  doorPosition: Position
  exitPosition: Position
  leftLayout: string[]
  rightLayout: string[]
}

const splitHallRooms: SplitHallRoom[] = [
  {
    name: 'Crossed Intake',
    leftStart: { x: 1, y: 1 },
    rightStart: { x: 1, y: 1 },
    keyPosition: { x: 8, y: 3 },
    doorPosition: { x: 7, y: 3 },
    exitPosition: { x: 13, y: 5 },
    leftLayout: [
      '###############',
      '#...#.....#...#',
      '#.#.#.###.#.#.#',
      '#.#...#.K.#.#.#',
      '#.#####.###.#.#',
      '#..R..........#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#.....R.......#',
      '#.###.#####.#.#',
      '#...#...D...#.#',
      '#.#.###.###.#.#',
      '#.#.........#E#',
      '###############',
    ],
  },
  {
    name: 'Offset Locks',
    leftStart: { x: 1, y: 5 },
    rightStart: { x: 1, y: 1 },
    keyPosition: { x: 11, y: 1 },
    doorPosition: { x: 9, y: 5 },
    exitPosition: { x: 13, y: 1 },
    leftLayout: [
      '###############',
      '#...#....S#K..#',
      '#.#.#.###.###.#',
      '#.#...#.....#.#',
      '#.#####.###.#.#',
      '#.......#.....#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#.....#......E#',
      '#.###.#.#####.#',
      '#...#...#.....#',
      '###.#####.###.#',
      '#..G.....D....#',
      '###############',
    ],
  },
  {
    name: 'Pane Switchback',
    leftStart: { x: 13, y: 5 },
    rightStart: { x: 1, y: 5 },
    keyPosition: { x: 2, y: 1 },
    doorPosition: { x: 11, y: 1 },
    exitPosition: { x: 13, y: 5 },
    leftLayout: [
      '###############',
      '#.K...#.......#',
      '#.###.#.#####.#',
      '#...#...#.....#',
      '#.#.#####.###.#',
      '#.#......W....#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#.....#....DR.#',
      '#.###.#.#####.#',
      '#.#...#.....#.#',
      '#.#.#####.#.#.#',
      '#.........#..E#',
      '###############',
    ],
  },
  {
    name: 'Guarded Relay',
    leftStart: { x: 1, y: 1 },
    rightStart: { x: 13, y: 1 },
    keyPosition: { x: 12, y: 5 },
    doorPosition: { x: 3, y: 3 },
    exitPosition: { x: 1, y: 5 },
    leftLayout: [
      '###############',
      '#.....#.......#',
      '#.###.#.#####.#',
      '#...#...#.....#',
      '###.#####.###.#',
      '#....S.....K..#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#.............#',
      '#.##########..#',
      '#..D........#.#',
      '#.#######.#...#',
      '#E.....G.....##',
      '###############',
    ],
  },
  {
    name: 'Exit Weave',
    leftStart: { x: 7, y: 5 },
    rightStart: { x: 1, y: 1 },
    keyPosition: { x: 7, y: 1 },
    doorPosition: { x: 11, y: 3 },
    exitPosition: { x: 13, y: 1 },
    leftLayout: [
      '###############',
      '#.....#K......#',
      '#.###.#.#####.#',
      '#.#...#..W..#.#',
      '#.#.#######.#.#',
      '#......#......#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#.........#..E#',
      '#.#######.#.#.#',
      '#.....#...D.#.#',
      '###.#.#.###.#.#',
      '#...#....R....#',
      '###############',
    ],
  },
]

function getRoomWidth(room: SplitHallRoom) {
  return room.leftLayout[0]?.length ?? 0
}

function getRoomHeight(room: SplitHallRoom) {
  return room.leftLayout.length
}

function getMovement(key: string): Position | null {
  if (key === 'h') return { x: -1, y: 0 }
  if (key === 'j') return { x: 0, y: 1 }
  if (key === 'k') return { x: 0, y: -1 }
  if (key === 'l') return { x: 1, y: 0 }
  return null
}

function isSamePosition(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y
}

function isWithinPickupReach(first: Position, second: Position) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) <= 1
}

function getPaneLayout(room: SplitHallRoom, pane: PaneId) {
  return pane === 'left' ? room.leftLayout : room.rightLayout
}

function isPaneWall(room: SplitHallRoom, pane: PaneId, position: Position) {
  const layout = getPaneLayout(room, pane)
  return layout[position.y]?.[position.x] === '#' || !layout[position.y]?.[position.x]
}

function getEnemyTile(cell: string): TmuxTile | null {
  if (cell === 'R') return { label: 'rusher rat', sprite: 'rat-rusher' }
  if (cell === 'S') return { label: 'sniper rat', sprite: 'rat-sniper' }
  if (cell === 'G') return { label: 'grenadier rat', sprite: 'rat-grenadier' }
  if (cell === 'W') return { label: 'warden rat', sprite: 'rat-warden' }
  return null
}

function isEnemyTile(room: SplitHallRoom, pane: PaneId, position: Position) {
  const layout = getPaneLayout(room, pane)
  return getEnemyTile(layout[position.y]?.[position.x] ?? '') !== null
}

function validateRoomLayouts() {
  for (const room of splitHallRooms) {
    const width = getRoomWidth(room)
    const height = getRoomHeight(room)
    const rows = [...room.leftLayout, ...room.rightLayout]
    if (room.rightLayout.length !== height || rows.some((row) => row.length !== width)) {
      throw new Error(`Split Hall room "${room.name}" has uneven pane layouts.`)
    }
  }
}

validateRoomLayouts()

export default function TmuxSplitHallScreen({
  levelMeta,
  difficulty,
}: TmuxSplitHallScreenProps) {
  const [roomIndex, setRoomIndex] = useState(0)
  const currentRoom = splitHallRooms[roomIndex]
  const [activePane, setActivePane] = useState<PaneId>('left')
  const [leftPlayer, setLeftPlayer] = useState<Position>(currentRoom.leftStart)
  const [rightPlayer, setRightPlayer] = useState<Position>(currentRoom.rightStart)
  const [isPrefixArmed, setIsPrefixArmed] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
  const [hasPickedUpKey, setHasPickedUpKey] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [message, setMessage] = useState('The Split Hall waits for a pane command.')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()

      if (hasEscaped) return

      if (isPrefixArmed) {
        if (event.key === 'h' || event.key === 'ArrowLeft') {
          setActivePane('left')
          setIsPrefixArmed(false)
          setMessage('Active pane: left.')
          return
        }

        if (event.key === 'l' || event.key === 'ArrowRight') {
          setActivePane('right')
          setIsPrefixArmed(false)
          setMessage('Active pane: right.')
          return
        }

        setIsPrefixArmed(false)
        setMessage('tmux prefix cleared.')
        return
      }

      if (event.key === 'b') {
        setIsPrefixArmed(true)
        setMessage('tmux prefix armed. Press h or l to choose a pane.')
        return
      }

      if (event.key.toLowerCase() === 'y') {
        if (
          activePane === 'left' &&
          !hasPickedUpKey &&
          isWithinPickupReach(leftPlayer, currentRoom.keyPosition)
        ) {
          setHasPickedUpKey(true)
          setIsDoorOpen(true)
          setMessage('You yank the left pane key. The right pane door unlocks.')
          return
        }

        setMessage('No key nearby. Stand next to the key and press Y.')
        return
      }

      const movement = getMovement(event.key)
      if (!movement) return

      const currentPlayer = activePane === 'left' ? leftPlayer : rightPlayer
      const nextPlayer = {
        x: currentPlayer.x + movement.x,
        y: currentPlayer.y + movement.y,
      }

      if (isPaneWall(currentRoom, activePane, nextPlayer)) {
        setMessage('A pane border blocks the move.')
        return
      }

      if (isEnemyTile(currentRoom, activePane, nextPlayer)) {
        setMessage('A pane guard blocks that route.')
        return
      }

      if (
        activePane === 'right' &&
        !isDoorOpen &&
        isSamePosition(nextPlayer, currentRoom.doorPosition)
      ) {
        setMessage('The right pane door is locked from the other pane.')
        return
      }

      if (activePane === 'left') {
        setLeftPlayer(nextPlayer)
      } else {
        setRightPlayer(nextPlayer)
        if (isDoorOpen && isSamePosition(nextPlayer, currentRoom.exitPosition)) {
          const nextRoom = splitHallRooms[roomIndex + 1]
          if (!nextRoom) {
            setHasEscaped(true)
            setMessage('The panes line up. The Split Hall is solved.')
            return
          }

          setRoomIndex((current) => current + 1)
          setActivePane('left')
          setLeftPlayer(nextRoom.leftStart)
          setRightPlayer(nextRoom.rightStart)
          setIsDoorOpen(false)
          setHasPickedUpKey(false)
          setMessage(`You enter ${nextRoom.name}.`)
          return
        }
      }

      setMessage(`Moved in the ${activePane} pane.`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePane, currentRoom, hasEscaped, hasPickedUpKey, isDoorOpen, isPrefixArmed, leftPlayer, rightPlayer, roomIndex])

  function getPaneTiles(pane: PaneId): TmuxTile[][] {
    const activePlayer = pane === 'left' ? leftPlayer : rightPlayer
    const layout = getPaneLayout(currentRoom, pane)

    return Array.from({ length: getRoomHeight(currentRoom) }, (_, y) =>
      Array.from({ length: getRoomWidth(currentRoom) }, (_, x) => {
        const position = { x, y }

        if (isSamePosition(position, activePlayer)) {
          return { label: 'you', sprite: 'player' }
        }

        if (isPaneWall(currentRoom, pane, position)) {
          return { label: 'wall', sprite: 'wall' }
        }

        if (pane === 'left' && !hasPickedUpKey && isSamePosition(position, currentRoom.keyPosition)) {
          return { label: 'key', sprite: 'key' }
        }

        if (pane === 'right' && isSamePosition(position, currentRoom.doorPosition)) {
          return {
            label: isDoorOpen ? 'open door' : 'locked door',
            sprite: isDoorOpen ? 'door-open' : 'door-locked',
          }
        }

        if (pane === 'right' && isSamePosition(position, currentRoom.exitPosition)) {
          return { label: 'exit', sprite: 'door-open' }
        }

        if (layout[y]?.[x] === 'K') {
          return { label: 'floor', sprite: 'floor' }
        }

        const enemyTile = getEnemyTile(layout[y]?.[x] ?? '')
        if (enemyTile) {
          return enemyTile
        }

        return { label: 'floor', sprite: 'floor' }
      }),
    )
  }

  function renderPane(pane: PaneId, title: string) {
    return (
      <div className={`tmux-pane ${activePane === pane ? 'tmux-pane--active' : ''}`}>
        <span className="tmux-pane-title">{title}</span>
        <div className="tmux-pane-map" aria-label={`${title} map`}>
          {getPaneTiles(pane).map((row, rowIndex) => (
            <div
              key={`${pane}-${rowIndex}`}
              className="map-row tmux-map-row"
              style={{ gridTemplateColumns: `repeat(${getRoomWidth(currentRoom)}, var(--sprite-size, 28px))` }}
            >
              {row.map((tile, cellIndex) => (
                <span
                  key={`${pane}-${rowIndex}-${cellIndex}`}
                  className={`map-cell map-cell--${tile.sprite}`}
                  aria-label={tile.label}
                  role="img"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="game-screen">
      <section className="main-panel" aria-label={`${levelMeta.roomName} tmux puzzle`}>
        <div className="tmux-level">
          <div className="tmux-pane-grid" aria-label="Tmux split panes">
            {renderPane('left', 'left pane')}
            {renderPane('right', 'right pane')}
          </div>
        </div>
      </section>
      <section className="side-column">
        <ObjectivePanel levelMeta={levelMeta} />
        <aside className="side-panel">
          <section className="side-section">
            <h2>Tmux</h2>
            <p>Room: {roomIndex + 1}/{splitHallRooms.length}</p>
            <p>Layout: {currentRoom.name}</p>
            <p>Active pane: {activePane}</p>
            <p>Prefix: {isPrefixArmed ? 'armed' : 'idle'}</p>
            <p>Door: {isDoorOpen ? 'open' : 'locked'}</p>
            <p>Mode: {difficulty === 'hard' ? 'Hard' : 'Normal'}</p>
          </section>
          <section className="side-section">
            <h2>Controls</h2>
            <p>h j k l move in the active pane.</p>
            <p>b then h/l switches panes.</p>
            <p>Y yanks a nearby key.</p>
          </section>
        </aside>
      </section>
      <StatusBar
        mode="normal"
        message={message}
        commandInput=""
        isCommandOpen={false}
        playerHealth={1}
        levelMeta={levelMeta}
      />
    </section>
  )
}
