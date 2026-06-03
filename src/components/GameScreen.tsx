import { useEffect, useRef, useState } from 'react'
import { runCommand } from '../game/commands'
import { attackMouse, isAdjacent, mouseMaxHealth, playerMaxHealth } from '../game/level'
import {
  type SecretRat,
  drawMap,
  isSamePosition,
  isSecretRoomEntrance,
  isSecretWallCornerPassable,
  isSecretWallPushable,
  isRightRoomWallPushable,
  dungeonDoorPosition,
  rightRoomChestKeyPosition,
  rightRoomChestPosition,
  roomWidth,
  isWall,
  mousePosition,
  startPosition,
} from '../game/map'
import type { GameMode, Position } from '../game/types'
import HelpPanel from './HelpPanel'
import ObjectivePanel from './ObjectivePanel'
import StatusBar from './StatusBar'
import { gameIntroMessage } from '../game/narrative'

export default function GameScreen() {
  const [player, setPlayer] = useState<Position>(startPosition)
  const [playerHealth, setPlayerHealth] = useState(playerMaxHealth)
  const [mouseHealth, setMouseHealth] = useState(mouseMaxHealth)
  const [showHelp, setShowHelp] = useState(true)
  const [mode, setMode] = useState<GameMode>('normal')
  const [commandInput, setCommandInput] = useState('')
  const [messages, setMessages] = useState([gameIntroMessage])
  const [message, setMessage] = useState(gameIntroMessage)
  const [isDead, setIsDead] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [secretRoomKnown, setSecretRoomKnown] = useState(false)
  const [secretWallShifted, setSecretWallShifted] = useState(false)
  const [secretWallShaking, setSecretWallShaking] = useState(false)
  const [secretPocketOpen, setSecretPocketOpen] = useState(false)
  const [secretPocketRats, setSecretPocketRats] = useState<SecretRat[]>([])
  const [mainMouseSkullVisible, setMainMouseSkullVisible] = useState(false)
  const [mainMouseKeyVisible, setMainMouseKeyVisible] = useState(false)
  const [doorKeyCount, setDoorKeyCount] = useState(0)
  const [chestKeyCount, setChestKeyCount] = useState(0)
  const [ratsUntilDinosaurUnlocked, setRatsUntilDinosaurUnlocked] = useState(3)
  const [isDinosaurAttackActive, setIsDinosaurAttackActive] = useState(false)
  const [rightRoomKnown, setRightRoomKnown] = useState(false)
  const [rightRoomRatsSpawned, setRightRoomRatsSpawned] = useState(false)
  const [rightRoomBlockShifted, setRightRoomBlockShifted] = useState(false)
  const [rightRoomChestKeyVisible, setRightRoomChestKeyVisible] = useState(false)
  const [rightRoomChestOpen, setRightRoomChestOpen] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
  const playerRef = useRef(player)
  const playerHealthRef = useRef(playerHealth)
  const mouseHealthRef = useRef(mouseHealth)
  const secretPocketRatsRef = useRef<SecretRat[]>(secretPocketRats)
  const ratReprisalTimeoutRef = useRef<number | null>(null)

  const isMouseAlive = mouseHealth > 0
  const doorUnlocked = !isMouseAlive
  const dinosaurAttackUnlocked = ratsUntilDinosaurUnlocked <= 0
  useEffect(() => {
    playerRef.current = player
    playerHealthRef.current = playerHealth
    mouseHealthRef.current = mouseHealth
    secretPocketRatsRef.current = secretPocketRats
  }, [mouseHealth, player, playerHealth, secretPocketRats])

  useEffect(() => {
    if (isDead || hasEscaped) {
      clearRatReprisalTimer()
    }
  }, [isDead, hasEscaped])

  useEffect(() => () => {
    if (ratReprisalTimeoutRef.current !== null) {
      window.clearTimeout(ratReprisalTimeoutRef.current)
      ratReprisalTimeoutRef.current = null
    }
  }, [])

  function clearRatReprisalTimer() {
    if (ratReprisalTimeoutRef.current === null) return

    window.clearTimeout(ratReprisalTimeoutRef.current)
    ratReprisalTimeoutRef.current = null
  }

  function canRatRetaliateFrom(position: Position) {
    if (isDead || hasEscaped) return false

    const isMainMouseAdjacent = mouseHealthRef.current > 0 && isAdjacent(position, mousePosition)
    const isSecretRatAdjacent = secretPocketRatsRef.current.some(
      (rat) => rat.health > 0 && isAdjacent(position, rat),
    )

    return isMainMouseAdjacent || isSecretRatAdjacent
  }

  function applyRatReprisal(damagePosition: Position) {
    if (!canRatRetaliateFrom(damagePosition)) {
      clearRatReprisalTimer()
      return
    }

    if (ratReprisalTimeoutRef.current !== null) return

    ratReprisalTimeoutRef.current = window.setTimeout(() => {
      ratReprisalTimeoutRef.current = null

      const currentPlayerPosition = playerRef.current
      if (!canRatRetaliateFrom(currentPlayerPosition) || isDead || hasEscaped) {
        return
      }

      const nextPlayerHealth = Math.max(0, playerHealthRef.current - 1)
      playerHealthRef.current = nextPlayerHealth
      setPlayerHealth(nextPlayerHealth)

      if (nextPlayerHealth <= 0) {
        setIsDead(true)
        addMessage('A rat strikes you. You lose all health.')
        return
      }

      addMessage('A nearby rat strikes you. You lose 1 health.')
      applyRatReprisal(currentPlayerPosition)
    }, 1000)
  }

  function triggerWallShake() {
    setSecretWallShaking(true)
    window.setTimeout(() => {
      setSecretWallShaking(false)
    }, 270)
  }

  function revealMainMouseKey() {
    setMainMouseSkullVisible(true)
    window.setTimeout(() => {
      setMainMouseSkullVisible(false)
      setMainMouseKeyVisible(true)
    }, 2000)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isDead || hasEscaped) return

      if (mode === 'command') {
        handleCommandKey(event)
        return
      }

      if (isDead) return

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

      if (event.key === 'z') {
        event.preventDefault()
        dinosaurAttack()
        return
      }

      const movement = getMovement(event.key)
      if (!movement) return

      event.preventDefault()
      movePlayer(movement)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    commandInput,
    doorUnlocked,
    hasEscaped,
    isDead,
    isMouseAlive,
    mode,
    mouseHealth,
    player,
    playerHealth,
    secretRoomKnown,
    rightRoomRatsSpawned,
    rightRoomBlockShifted,
    rightRoomChestKeyVisible,
    rightRoomChestOpen,
    secretWallShifted,
    secretPocketOpen,
    secretPocketRats,
    mainMouseSkullVisible,
    mainMouseKeyVisible,
    doorKeyCount,
    chestKeyCount,
    isDoorOpen,
    rightRoomKnown,
    ratsUntilDinosaurUnlocked,
    isDinosaurAttackActive,
  ])

  function addMessage(nextMessage: string) {
    setMessage(nextMessage)
    setMessages((current) => [nextMessage, ...current].slice(0, 6))
  }

  function applyRatDefeatProgress(isDinosaur = false) {
    setRatsUntilDinosaurUnlocked((count) => {
      if (isDinosaur) {
        if (count <= 0) {
          addMessage('You spent Dinosaur Attack. Defeat 3 more rats to unlock it again.')
        }
        return 3
      }

      const nextCount = Math.max(0, count - 1)
      if (nextCount === 0) {
        addMessage('The ancient fury awakens: Dinosaur Attack unlocked.')
      } else {
        addMessage(`Need ${nextCount} more rat kills to unlock Dinosaur Attack.`)
      }
      return nextCount
    })
  }

  function processRatAttack(adjacentRatIndex: number, isDinosaur = false) {
    const rat = secretPocketRats[adjacentRatIndex]
    if (!rat) return

    const nextHealth = isDinosaur ? 0 : Math.max(0, rat.health - 1)

    if (nextHealth === 0) {
      const nextRats = secretPocketRats.map((value, index) =>
        index === adjacentRatIndex
          ? { ...value, health: nextHealth, defeatedByDinosaur: isDinosaur }
          : { ...value, defeatedByDinosaur: value.defeatedByDinosaur },
      )
      setSecretPocketRats(nextRats)
      applyRatDefeatProgress(isDinosaur)
      if (isDinosaur) {
        triggerWallShake()
      }
      addMessage('The mouse falls.')
      if (isDinosaur) {
        addMessage('You unleash a Dinosaur Attack!')
      }

      const defeatedRat = nextRats[adjacentRatIndex]
      window.setTimeout(() => {
        setSecretPocketRats((current) =>
          current.filter(
            (rat) => !(rat.x === defeatedRat.x && rat.y === defeatedRat.y && rat.health === 0),
          ),
        )
      }, 2000)
      return
    }

    const nextRats = secretPocketRats.map((value, index) =>
      index === adjacentRatIndex ? { ...value, health: nextHealth } : value,
    )
    setSecretPocketRats(nextRats)
    addMessage(`You strike the mouse. Mouse health: ${nextHealth}/${mouseMaxHealth}.`)
  }

  function attack() {
    const adjacentRatIndex = secretPocketRats.findIndex(
      (rat) => rat.health > 0 && isAdjacent(player, rat),
    )
    if (adjacentRatIndex >= 0) {
      processRatAttack(adjacentRatIndex)
      applyRatReprisal(player)
      return
    }

    if (!isMouseAlive) {
      addMessage('The mouse is already defeated.')
      applyRatReprisal(player)
      return
    }

    if (!isAdjacent(player, mousePosition)) {
      addMessage('You swing at the empty air. Move next to the mouse first.')
      applyRatReprisal(player)
      return
    }

    const result = attackMouse(mouseHealth)
    if (result.mouseHealth === 0) {
      applyRatDefeatProgress()
      revealMainMouseKey()
    }
    setMouseHealth(result.mouseHealth)
    addMessage(result.message)
    applyRatReprisal(player)
  }

  function dinosaurAttack() {
    if (!dinosaurAttackUnlocked) {
      addMessage('You have not unlocked Dinosaur Attack yet.')
      return
    }

    const adjacentRatIndex = secretPocketRats.findIndex(
      (rat) => rat.health > 0 && isAdjacent(player, rat),
    )

    if (adjacentRatIndex < 0) {
      if (!isMouseAlive || !isAdjacent(player, mousePosition)) {
        addMessage('You roar, but no mouse is within reach.')
        return
      }

      setIsDinosaurAttackActive(true)
      window.setTimeout(() => {
        setIsDinosaurAttackActive(false)
      }, 1000)
      setMouseHealth(0)
      applyRatDefeatProgress(true)
      addMessage('You unleash a Dinosaur Attack!')
      addMessage('The mouse falls. The cell door unlocks.')
      triggerWallShake()
      revealMainMouseKey()
      applyRatReprisal(player)
      return
    }

    setIsDinosaurAttackActive(true)
    window.setTimeout(() => {
      setIsDinosaurAttackActive(false)
    }, 1000)
    processRatAttack(adjacentRatIndex, true)
    applyRatReprisal(player)
  }

  const secretPocketRatSpawns: Array<Position> = [
    { x: 1, y: -3 },
    { x: 3, y: -3 },
    { x: 1, y: -2 },
    { x: 3, y: -2 },
    { x: 2, y: -1 },
  ]
  const rightRoomRatSpawns: Array<Position> = [
    { x: 15, y: 4 },
    { x: 17, y: 1 },
    { x: 21, y: 3 },
  ]

  function movePlayer(movement: Position) {
    const next = { x: player.x + movement.x, y: player.y + movement.y }
    const passesThroughSecretEntrance =
      !secretRoomKnown &&
      isSecretRoomEntrance(player) &&
      next.x === player.x &&
      next.y === player.y - 1
    const passesThroughRightDoor =
      !rightRoomKnown &&
      isDoorOpen &&
      next.x === roomWidth &&
      next.y === dungeonDoorPosition.y &&
      player.x === roomWidth - 1 &&
      player.y === dungeonDoorPosition.y

    const canPushSecretWall = isSecretWallPushable(player, next, secretWallShifted)
    const canPassLeftCornerWall = isSecretWallCornerPassable(
      player,
      next,
      secretWallShifted,
      secretPocketOpen,
    )
    const canPushRightRoomWall = isRightRoomWallPushable(
      player,
      next,
      rightRoomBlockShifted,
    )
    const isRightRoomChestTile =
      !rightRoomChestOpen &&
      next.x === rightRoomChestPosition.x &&
      next.y === rightRoomChestPosition.y
    const isRightRoomKeyTile =
      rightRoomChestKeyVisible &&
      next.x === rightRoomChestKeyPosition.x &&
      next.y === rightRoomChestKeyPosition.y
    const isDoorTile = !isDoorOpen && next.x === dungeonDoorPosition.x && next.y === dungeonDoorPosition.y

    if (
      (isWall(
        next,
        secretRoomKnown,
        secretWallShifted,
        secretPocketOpen,
        secretPocketRats,
        isDoorOpen,
        rightRoomKnown,
        rightRoomBlockShifted,
        rightRoomChestOpen,
      ) &&
        !passesThroughSecretEntrance &&
        !canPushSecretWall &&
        !canPassLeftCornerWall &&
        !passesThroughRightDoor &&
        !canPushRightRoomWall &&
        !isRightRoomChestTile) ||
      (isMouseAlive && isSamePosition(next, mousePosition))
    ) {
      if (isDoorTile && doorKeyCount > 0) {
        setIsDoorOpen(true)
        setDoorKeyCount((currentCount) => currentCount - 1)
        setPlayer(next)
        applyRatReprisal(next)
        addMessage('The door unlocks and crumbles away.')
        return
      }

      if (isRightRoomChestTile) {
        if (chestKeyCount > 0) {
          setChestKeyCount((currentCount) => currentCount - 1)
          setRightRoomChestOpen(true)
          setRightRoomChestKeyVisible(false)
          setPlayer(next)
          addMessage('You unlock the chest with a chest key. It opens with a soft click.')
          applyRatReprisal(next)
          return
        }

        addMessage('The chest is locked. Find a ⚿.')
        applyRatReprisal(player)
        return
      }

      addMessage('That path is blocked. Try another motion.')
      applyRatReprisal(player)
      return
    }

    if (passesThroughSecretEntrance) {
      setSecretRoomKnown(true)
      addMessage('A hidden passage opens; a new area emerges behind the wall.')
    }
    if (passesThroughRightDoor) {
      setRightRoomKnown(true)
      addMessage('A hidden chamber opens in the wall to your right.')
      if (!rightRoomRatsSpawned) {
        setSecretPocketRats((current) => {
          const spawnableRats = rightRoomRatSpawns
            .filter(
              (rat) =>
                !current.some(
                  (existing) => existing.x === rat.x && existing.y === rat.y,
                ),
            )
            .map((rat) => ({ ...rat, health: mouseMaxHealth }))

          return [...current, ...spawnableRats]
        })
        setRightRoomRatsSpawned(true)
        addMessage('You hear restless movement from the shadows.')
      }
    }

    if (canPushSecretWall) {
      setSecretWallShifted(true)
      triggerWallShake()
      addMessage('You push the wall upward.')
    }

    if (canPassLeftCornerWall) {
      setSecretPocketOpen(true)
      setSecretPocketRats(
        secretPocketRatSpawns
          .filter(
            (rat) =>
              (rat.x !== next.x || rat.y !== next.y) &&
              (rat.x !== player.x || rat.y !== player.y),
          )
          .map((rat) => ({ ...rat, health: mouseMaxHealth })),
      )
      addMessage('A narrow corridor opens to a smaller chamber.')
    }

    if (canPushRightRoomWall) {
      setRightRoomBlockShifted(true)
      setRightRoomChestKeyVisible(true)
      triggerWallShake()
      addMessage('You shift the hidden wall inward. A hidden key appears.')
    }

    if (!isMouseAlive && mainMouseKeyVisible && isSamePosition(next, mousePosition)) {
      setMainMouseKeyVisible(false)
      setDoorKeyCount((currentCount) => currentCount + 1)
      addMessage('You pick up a key.')
    }

    if (isRightRoomKeyTile) {
      setRightRoomChestKeyVisible(false)
      setChestKeyCount((currentCount) => currentCount + 1)
      addMessage('You pick up a chest key.')
    }

    setPlayer(next)
    applyRatReprisal(next)

    if (isMouseAlive && isAdjacent(next, mousePosition)) {
      addMessage('You are next to the mouse. Press x to strike.')
      return
    }

    addMessage('You move through the cell.')
  }

  function restartGame(messageText = gameIntroMessage) {
    clearRatReprisalTimer()
    setPlayer(startPosition)
    setPlayerHealth(playerMaxHealth)
    setMouseHealth(mouseMaxHealth)
    setIsDead(false)
    setHasEscaped(false)
    setShowHelp(true)
    setSecretRoomKnown(false)
    setSecretWallShifted(false)
    setSecretPocketOpen(false)
    setSecretPocketRats([])
    setMainMouseSkullVisible(false)
    setMainMouseKeyVisible(false)
    setDoorKeyCount(0)
    setChestKeyCount(0)
    setSecretWallShaking(false)
    setRatsUntilDinosaurUnlocked(3)
    setRightRoomRatsSpawned(false)
    setRightRoomBlockShifted(false)
    setRightRoomChestKeyVisible(false)
    setRightRoomChestOpen(false)
    setIsDinosaurAttackActive(false)
    setRightRoomKnown(false)
    setIsDoorOpen(false)
    setMessages([messageText])
    setMessage(messageText)
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
      if (result.shouldRestart) {
        restartGame(result.message)
      } else {
        addMessage(result.showIntro ? gameIntroMessage : result.message)
        setIsDead(Boolean(result.isTrap))
        setHasEscaped(Boolean(result.escaped))
      }
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

  const mapRows = drawMap(
    player,
    mouseHealth,
    secretRoomKnown,
    secretWallShifted,
    secretPocketOpen,
    secretPocketRats,
    mainMouseSkullVisible,
    mainMouseKeyVisible,
    isDoorOpen,
    rightRoomKnown,
    rightRoomBlockShifted,
    rightRoomChestKeyVisible,
    rightRoomChestOpen,
  ).split('\n')

  return (
    <section className="game-screen">
        <section className="main-panel" aria-label="Prison room">
        <div className="door-unlocked-banner">
          Door Keys: {doorKeyCount} 🔑 | Chest Keys: {chestKeyCount} ⚿
        </div>
        <pre className={`ascii-map${secretWallShaking ? ' ascii-map--shake' : ''}`}>
          {mapRows.map((row, rowIndex) => (
            <span
              key={`row-${rowIndex}`}
              className="map-row"
              aria-hidden
            >
              {Array.from(row).map((cell, cellIndex) => {
                const displayedCell = cell === '😎' && isDinosaurAttackActive ? '🦖' : cell
                const isGlyphCell =
                  displayedCell === '🐁' ||
                  displayedCell === '💀' ||
                  displayedCell === '💥' ||
                  displayedCell === '😎' ||
                  displayedCell === '🦖' ||
                  displayedCell === '🚪' ||
                  displayedCell === '🔑'
                  || displayedCell === '⚿' ||
                  displayedCell === '🪎'
                return (
                  <span
                    key={`${rowIndex}-${cellIndex}`}
                    className={`map-cell${isGlyphCell ? ' map-cell-emoji' : ''}`}
                  >
                    {displayedCell}
                  </span>
                )
              })}
            </span>
          ))}
        </pre>
        <div className="legend">
          <span>😎 you</span>
          <span>🦖 Dinosaur Attack (z)</span>
          <span>
            {dinosaurAttackUnlocked
              ? '🦖 Dinosaur Attack: READY'
              : `🦖 Dinosaur Attack: ${ratsUntilDinosaurUnlocked} more rat kills`}
          </span>
          <span>💥 dinosaur kill</span>
          <span>🐁 mouse</span>
          <span>💀 defeated mouse</span>
          <span>🔑 door key</span>
          <span>⚿ chest key</span>
          <span>🚪 locked door</span>
          <span>🪎 chest</span>
          <span># wall</span>
        </div>
      </section>
      <section className="side-column">
        <ObjectivePanel />
        <HelpPanel showHelp={showHelp} playerHealth={playerHealth} mouseHealth={mouseHealth} messages={messages} />
      </section>
      <StatusBar
        mode={mode}
        message={message}
        commandInput={commandInput}
        isCommandOpen={mode === 'command'}
        playerHealth={playerHealth}
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
