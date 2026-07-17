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

const paneWidth = 11
const paneHeight = 5
const leftStart: Position = { x: 1, y: 1 }
const rightStart: Position = { x: 1, y: 3 }
const leverPosition: Position = { x: 5, y: 1 }
const doorPosition: Position = { x: 5, y: 3 }
const exitPosition: Position = { x: 9, y: 3 }

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

function isOuterWall(position: Position) {
  return (
    position.x <= 0 ||
    position.x >= paneWidth - 1 ||
    position.y <= 0 ||
    position.y >= paneHeight - 1
  )
}

function isPaneWall(pane: PaneId, position: Position) {
  if (isOuterWall(position)) return true

  if (pane === 'left') {
    return position.y !== 1
  }

  return position.y !== 3
}

export default function TmuxSplitHallScreen({
  levelMeta,
  difficulty,
}: TmuxSplitHallScreenProps) {
  const [activePane, setActivePane] = useState<PaneId>('left')
  const [leftPlayer, setLeftPlayer] = useState<Position>(leftStart)
  const [rightPlayer, setRightPlayer] = useState<Position>(rightStart)
  const [isPrefixArmed, setIsPrefixArmed] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
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

      const movement = getMovement(event.key)
      if (!movement) return

      const currentPlayer = activePane === 'left' ? leftPlayer : rightPlayer
      const nextPlayer = {
        x: currentPlayer.x + movement.x,
        y: currentPlayer.y + movement.y,
      }

      if (isPaneWall(activePane, nextPlayer)) {
        setMessage('A pane border blocks the move.')
        return
      }

      if (
        activePane === 'right' &&
        !isDoorOpen &&
        isSamePosition(nextPlayer, doorPosition)
      ) {
        setMessage('The right pane door is locked from the other pane.')
        return
      }

      if (activePane === 'left') {
        setLeftPlayer(nextPlayer)
        if (isSamePosition(nextPlayer, leverPosition)) {
          setIsDoorOpen(true)
          setMessage('The left pane lever opens the right pane door.')
          return
        }
      } else {
        setRightPlayer(nextPlayer)
        if (isDoorOpen && isSamePosition(nextPlayer, exitPosition)) {
          setHasEscaped(true)
          setMessage('The panes line up. The Split Hall is solved.')
          return
        }
      }

      setMessage(`Moved in the ${activePane} pane.`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePane, hasEscaped, isDoorOpen, isPrefixArmed, leftPlayer, rightPlayer])

  function getPaneTiles(pane: PaneId): TmuxTile[][] {
    const activePlayer = pane === 'left' ? leftPlayer : rightPlayer

    return Array.from({ length: paneHeight }, (_, y) =>
      Array.from({ length: paneWidth }, (_, x) => {
        const position = { x, y }

        if (isSamePosition(position, activePlayer)) {
          return { label: 'you', sprite: 'player' }
        }

        if (isPaneWall(pane, position)) {
          return { label: 'wall', sprite: 'wall' }
        }

        if (pane === 'left' && isSamePosition(position, leverPosition)) {
          return { label: isDoorOpen ? 'used lever' : 'lever', sprite: 'key' }
        }

        if (pane === 'right' && isSamePosition(position, doorPosition)) {
          return {
            label: isDoorOpen ? 'open door' : 'locked door',
            sprite: isDoorOpen ? 'door-open' : 'door-locked',
          }
        }

        if (pane === 'right' && isSamePosition(position, exitPosition)) {
          return { label: 'exit', sprite: 'door-open' }
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
              style={{ gridTemplateColumns: `repeat(${paneWidth}, var(--sprite-size, 28px))` }}
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
            <p>Active pane: {activePane}</p>
            <p>Prefix: {isPrefixArmed ? 'armed' : 'idle'}</p>
            <p>Door: {isDoorOpen ? 'open' : 'locked'}</p>
            <p>Mode: {difficulty === 'hard' ? 'Hard' : 'Normal'}</p>
          </section>
          <section className="side-section">
            <h2>Controls</h2>
            <p>h j k l move in the active pane.</p>
            <p>b then h/l switches panes.</p>
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
