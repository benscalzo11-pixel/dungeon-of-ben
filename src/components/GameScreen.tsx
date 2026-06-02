import { useEffect, useState } from 'react'
import { runCommand } from '../game/commands'
import { attackMouse, getObjective, isAdjacent, mouseMaxHealth, playerMaxHealth } from '../game/level'
import { drawMap, isSamePosition, isWall, mousePosition, startPosition } from '../game/map'
import type { GameMode, Position } from '../game/types'
import HelpPanel from './HelpPanel'
import StatusBar from './StatusBar'

const introText =
  'You wake inside a Vim cell. The mouse blocks the corridor. Learn movement first.'

export default function GameScreen() {
  const [player, setPlayer] = useState<Position>(startPosition)
  const [playerHealth] = useState(playerMaxHealth)
  const [mouseHealth, setMouseHealth] = useState(mouseMaxHealth)
  const [showHelp, setShowHelp] = useState(true)
  const [mode, setMode] = useState<GameMode>('normal')
  const [commandInput, setCommandInput] = useState('')
  const [message, setMessage] = useState(introText)
  const [messages, setMessages] = useState([introText])
  const [isDead, setIsDead] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)

  const isMouseAlive = mouseHealth > 0
  const doorUnlocked = !isMouseAlive
  const objective = getObjective(mouseHealth)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isDead || hasEscaped) return

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

      if (event.key === 'x') {
        event.preventDefault()
        attack()
        return
      }

      const movement = getMovement(event.key)
      if (!movement) return

      event.preventDefault()
      movePlayer(movement)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandInput, doorUnlocked, hasEscaped, isDead, isMouseAlive, mode, mouseHealth, player])

  function addMessage(nextMessage: string) {
    setMessage(nextMessage)
    setMessages((current) => [nextMessage, ...current].slice(0, 6))
  }

  function attack() {
    if (!isMouseAlive) {
      addMessage('The mouse is already defeated.')
      return
    }

    if (!isAdjacent(player, mousePosition)) {
      addMessage('You swing at the empty air. Move next to the mouse first.')
      return
    }

    const result = attackMouse(mouseHealth)
    setMouseHealth(result.mouseHealth)
    addMessage(result.message)
  }

  function movePlayer(movement: Position) {
    const next = { x: player.x + movement.x, y: player.y + movement.y }

    if (isWall(next) || (isMouseAlive && isSamePosition(next, mousePosition))) {
      addMessage('That path is blocked. Try another motion.')
      return
    }

    setPlayer(next)

    if (isMouseAlive && isAdjacent(next, mousePosition)) {
      addMessage('You are next to the mouse. Press x to strike.')
      return
    }

    addMessage('You move through the cell.')
  }

  function handleCommandKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setMode('normal')
      setCommandInput('')
      addMessage('Back to NORMAL mode.')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const result = runCommand(commandInput, { doorUnlocked })
      setMode('normal')
      setCommandInput('')
      addMessage(result.showIntro ? introText : result.message)
      setIsDead(Boolean(result.isTrap))
      setHasEscaped(Boolean(result.escaped))
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
        <pre className="ascii-map">{drawMap(player, mouseHealth, doorUnlocked)}</pre>
        <div className="legend">
          <span>@ you</span>
          <span>M mouse</span>
          <span>m defeated mouse</span>
          <span>D locked door</span>
          <span>O open door</span>
          <span># wall</span>
        </div>
      </section>
      <HelpPanel
        showHelp={showHelp}
        objective={objective}
        playerHealth={playerHealth}
        mouseHealth={mouseHealth}
        messages={messages}
      />
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
