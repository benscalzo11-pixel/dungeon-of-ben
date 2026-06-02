import { useEffect, useState } from 'react'
import { runCommand } from '../game/commands'
import { drawMap, isWall, startPosition } from '../game/map'
import type { GameMode, Position } from '../game/types'
import HelpPanel from './HelpPanel'
import StatusBar from './StatusBar'

const introText =
  'You wake inside a Vim cell. The mouse blocks the corridor. Learn movement first.'

export default function GameScreen() {
  const [player, setPlayer] = useState<Position>(startPosition)
  const [showHelp, setShowHelp] = useState(true)
  const [mode, setMode] = useState<GameMode>('normal')
  const [commandInput, setCommandInput] = useState('')
  const [message, setMessage] = useState(introText)
  const [isDead, setIsDead] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isDead) return

      if (mode === 'command') {
        handleCommandKey(event)
        return
      }

      if (event.key === '?') {
        event.preventDefault()
        setShowHelp((current) => !current)
        return
      }

      if (event.key === ':') {
        event.preventDefault()
        setMode('command')
        setCommandInput('')
        return
      }

      const movement = getMovement(event.key)
      if (!movement) return

      event.preventDefault()
      setPlayer((current) => {
        const next = { x: current.x + movement.x, y: current.y + movement.y }

        if (isWall(next)) {
          setMessage('That wall does not yield. Try another motion.')
          return current
        }

        setMessage('You move through the cell.')
        return next
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandInput, isDead, mode])

  function handleCommandKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setMode('normal')
      setCommandInput('')
      setMessage('Back to NORMAL mode.')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const result = runCommand(commandInput)
      setMode('normal')
      setCommandInput('')
      setMessage(result.showIntro ? introText : result.message)
      setIsDead(Boolean(result.isTrap))
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      setCommandInput((current) => current.slice(0, -1))
      return
    }

    if (event.key.length === 1) {
      event.preventDefault()
      setCommandInput((current) => `${current}${event.key}`)
    }
  }

  return (
    <section className="game-screen">
      <section className="main-panel" aria-label="Prison room">
        <pre className="ascii-map">{drawMap(player)}</pre>
        <div className="legend">
          <span>@ you</span>
          <span>M mouse</span>
          <span>D locked door</span>
          <span># wall</span>
        </div>
      </section>
      <HelpPanel showHelp={showHelp} />
      <StatusBar
        mode={mode}
        message={message}
        commandInput={commandInput}
        isCommandOpen={mode === 'command'}
      />
    </section>
  )
}

function getMovement(key: string): Position | null {
  if (key === 'h') return { x: -1, y: 0 }
  if (key === 'j') return { x: 0, y: 1 }
  if (key === 'k') return { x: 0, y: -1 }
  if (key === 'l') return { x: 1, y: 0 }
  return null
}
