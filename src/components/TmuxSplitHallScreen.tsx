import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
  enemyId?: string
}

type PaneEnemy = {
  id: string
  pane: PaneId
  position: Position
  label: string
  sprite: string
  health: number
}

type EnemyHitMarker = {
  id: number
  enemyId: string
  x: number
  y: number
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
      '#...#..S..#...#',
      '#.#.#.###.#.#.#',
      '#.#...#.K.#.#.#',
      '#.#####.###.#.#',
      '#..R....G.....#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#..G..R.......#',
      '#.###.#####.#.#',
      '#...#S..D..G#.#',
      '#.#.###.###.#.#',
      '#.#.........#.#',
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
      '#.R.#....S#K..#',
      '#.#.#.###.###.#',
      '#.#...#.....#.#',
      '#.#####.###.#.#',
      '#..G....#..R..#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#..S..#....R..#',
      '#.###.#.#####.#',
      '#...#...#.....#',
      '###.#####.###.#',
      '#..G.R...D....#',
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
      '#.K.R.#....S..#',
      '#.###.#.#####.#',
      '#...#G..#.....#',
      '#.#.#####.###.#',
      '#.#..R...W....#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#..S..#....DR.#',
      '#.###.#.#####.#',
      '#.#...#..G..#.#',
      '#.#.#####.#.#.#',
      '#....R....#...#',
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
      '#..R..#..S....#',
      '#.###.#.#####.#',
      '#...#G..#.....#',
      '###.#####.###.#',
      '#..R.S.....K..#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#..S......R...#',
      '#.##########..#',
      '#..D..G.....#.#',
      '#.#######.#...#',
      '#..R...G.....##',
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
      '#..R..#K..S...#',
      '#.###.#.#####.#',
      '#.#.G.#..W..#.#',
      '#.#.#######.#.#',
      '#..R...#..G...#',
      '###############',
    ],
    rightLayout: [
      '###############',
      '#..S......#...#',
      '#.#######.#.#.#',
      '#..G..#...D.#.#',
      '###.#.#.###.#.#',
      '#.R.#..S.R....#',
      '###############',
    ],
  },
]

const NORMAL_ENEMY_MOVE_INTERVAL_MS = 667
const RAT_REPRISAL_COOLDOWN_MS = 310
const BOMB_RECHARGE_DELAY_MS = 2000
const ENEMY_MAX_HEALTH = 3
const VIM_ATTACK_DAMAGE = 1
const BOMB_DAMAGE = 3
const HIT_MARKER_DURATION_MS = 1000
const HIT_FLASH_DURATION_MS = 240
const DEFEATED_ENEMY_CLEANUP_MS = 180
const playerMaxHealth = 2
const movementDirections: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
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

function isAdjacent(first: Position, second: Position) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1
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
  if (cell === 'R' || cell === 'S' || cell === 'G' || cell === 'W') {
    return { label: 'mouse', sprite: 'rat' }
  }

  return null
}

function getInitialEnemies(room: SplitHallRoom): PaneEnemy[] {
  const enemies: PaneEnemy[] = []

  for (const pane of ['left', 'right'] as PaneId[]) {
    const layout = getPaneLayout(room, pane)
    layout.forEach((row, y) => {
      Array.from(row).forEach((cell, x) => {
        const enemyTile = getEnemyTile(cell)
        if (!enemyTile) return

        enemies.push({
          id: `${pane}-${x}-${y}`,
          pane,
          position: { x, y },
          label: enemyTile.label,
          sprite: enemyTile.sprite,
          health: ENEMY_MAX_HEALTH,
        })
      })
    })
  }

  return enemies
}

function getShuffledDirections() {
  const directions = [...movementDirections]
  for (let index = directions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentDirection = directions[index]
    directions[index] = directions[swapIndex]
    directions[swapIndex] = currentDirection
  }
  return directions
}

function validateRoomLayouts() {
  for (const room of splitHallRooms) {
    const width = getRoomWidth(room)
    const height = getRoomHeight(room)
    const rows = [...room.leftLayout, ...room.rightLayout]
    if (room.rightLayout.length !== height || rows.some((row) => row.length !== width)) {
      throw new Error(`Split Hall room "${room.name}" has uneven pane layouts.`)
    }
    if (!room.leftLayout.join('').match(/[RSGW]/) || !room.rightLayout.join('').match(/[RSGW]/)) {
      throw new Error(`Split Hall room "${room.name}" needs enemies in both panes.`)
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
  const [enemies, setEnemies] = useState<PaneEnemy[]>(() => getInitialEnemies(currentRoom))
  const [enemyHitMarkers, setEnemyHitMarkers] = useState<EnemyHitMarker[]>([])
  const [hitFlashEnemyIds, setHitFlashEnemyIds] = useState<string[]>([])
  const [chargingEnemyIds, setChargingEnemyIds] = useState<string[]>([])
  const [playerHealth, setPlayerHealth] = useState(playerMaxHealth)
  const [isPrefixArmed, setIsPrefixArmed] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
  const [hasPickedUpKey, setHasPickedUpKey] = useState(false)
  const [isDead, setIsDead] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [isBombReady, setIsBombReady] = useState(true)
  const [attackFlashPane, setAttackFlashPane] = useState<PaneId | null>(null)
  const [attackFlashId, setAttackFlashId] = useState(0)
  const [message, setMessage] = useState('The Split Hall waits for a pane command.')
  const enemyMoveIntervalRef = useRef<number | null>(null)
  const enemyAttackTimeoutRef = useRef<number | null>(null)
  const bombCooldownTimeoutRef = useRef<number | null>(null)
  const playerAttackFlashTimeoutRef = useRef<number | null>(null)
  const hitMarkerTimeoutsRef = useRef<number[]>([])
  const hitFlashTimeoutsRef = useRef<number[]>([])
  const defeatedEnemyTimeoutsRef = useRef<number[]>([])
  const playerHealthRef = useRef(playerMaxHealth)
  const activePaneRef = useRef<PaneId>('left')
  const leftPlayerRef = useRef(currentRoom.leftStart)
  const rightPlayerRef = useRef(currentRoom.rightStart)
  const enemiesRef = useRef<PaneEnemy[]>([])
  const chargingEnemyIdsRef = useRef<Set<string>>(new Set())
  const roomWidth = getRoomWidth(currentRoom)
  const roomHeight = getRoomHeight(currentRoom)
  const paneGridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${roomWidth}, var(--sprite-size, 28px))` }),
    [roomWidth],
  )

  function clearEnemyTimers() {
    if (enemyMoveIntervalRef.current !== null) {
      window.clearInterval(enemyMoveIntervalRef.current)
      enemyMoveIntervalRef.current = null
    }
    if (enemyAttackTimeoutRef.current !== null) {
      window.clearTimeout(enemyAttackTimeoutRef.current)
      enemyAttackTimeoutRef.current = null
    }
    if (bombCooldownTimeoutRef.current !== null) {
      window.clearTimeout(bombCooldownTimeoutRef.current)
      bombCooldownTimeoutRef.current = null
    }
    if (enemyAttackTimeoutRef.current === null) {
      setChargingEnemyIds([])
      chargingEnemyIdsRef.current = new Set()
    }
    if (playerAttackFlashTimeoutRef.current !== null) {
      window.clearTimeout(playerAttackFlashTimeoutRef.current)
      playerAttackFlashTimeoutRef.current = null
    }
    for (const timeoutId of hitMarkerTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    hitMarkerTimeoutsRef.current = []
    for (const timeoutId of hitFlashTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    hitFlashTimeoutsRef.current = []
    for (const timeoutId of defeatedEnemyTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    defeatedEnemyTimeoutsRef.current = []
  }

  function resetSplitHall(messageText = 'The Split Hall resets.') {
    clearEnemyTimers()
    const firstRoom = splitHallRooms[0]
    setRoomIndex(0)
    setActivePane('left')
    setLeftPlayer(firstRoom.leftStart)
    setRightPlayer(firstRoom.rightStart)
    setEnemies(getInitialEnemies(firstRoom))
    setEnemyHitMarkers([])
    setHitFlashEnemyIds([])
    setChargingEnemyIds([])
    chargingEnemyIdsRef.current = new Set()
    setPlayerHealth(playerMaxHealth)
    playerHealthRef.current = playerMaxHealth
    setIsPrefixArmed(false)
    setIsDoorOpen(false)
    setHasPickedUpKey(false)
    setIsDead(false)
    setHasEscaped(false)
    setIsBombReady(true)
    setAttackFlashPane(null)
    setAttackFlashId(0)
    setMessage(messageText)
  }

  function getEnemyAt(
    pane: PaneId,
    position: Position,
    enemyState = enemies,
    includeDefeated = true,
  ) {
    return enemyState.find((enemy) =>
      enemy.pane === pane &&
      isSamePosition(enemy.position, position) &&
      (includeDefeated || enemy.health > 0),
    )
  }

  function getEnemyHitDots(enemyId: string) {
    return enemyHitMarkers.filter((marker) => marker.enemyId === enemyId)
  }

  function canEnemyMoveTo(
    enemy: PaneEnemy,
    position: Position,
    enemyState: PaneEnemy[],
  ) {
    const playerPosition = enemy.pane === 'left' ? leftPlayer : rightPlayer
    return (
      !isPaneWall(currentRoom, enemy.pane, position) &&
      !isSamePosition(playerPosition, position) &&
      !isSamePosition(currentRoom.keyPosition, position) &&
      !isSamePosition(currentRoom.doorPosition, position) &&
      !isSamePosition(currentRoom.exitPosition, position) &&
      !enemyState.some((candidate) =>
        candidate.id !== enemy.id &&
        candidate.health > 0 &&
        candidate.pane === enemy.pane &&
        isSamePosition(candidate.position, position),
      )
    )
  }

  function moveEnemies() {
    setEnemies((currentEnemies) => {
      const nextEnemies = [...currentEnemies]
      for (const enemy of nextEnemies) {
        if (enemy.health <= 0) continue
        if (chargingEnemyIdsRef.current.has(enemy.id)) continue
        const nextPosition = getShuffledDirections()
          .map((direction) => ({
            x: enemy.position.x + direction.x,
            y: enemy.position.y + direction.y,
          }))
          .find((position) => canEnemyMoveTo(enemy, position, nextEnemies))

        if (nextPosition) {
          enemy.position = nextPosition
        }
      }
      return nextEnemies.map((enemy) => ({ ...enemy, position: { ...enemy.position } }))
    })
  }

  function getActivePaneAdjacentEnemies(
    enemyState = enemiesRef.current,
    pane = activePaneRef.current,
  ) {
    const playerPosition = pane === 'left' ? leftPlayerRef.current : rightPlayerRef.current

    return enemyState
      .filter((enemy) => {
        if (enemy.health <= 0) return false
        return enemy.pane === pane && isAdjacent(enemy.position, playerPosition)
      })
  }

  function setChargingEnemies(nextChargingEnemies: PaneEnemy[]) {
    const nextIds = nextChargingEnemies.map((enemy) => enemy.id)
    chargingEnemyIdsRef.current = new Set(nextIds)
    setChargingEnemyIds(nextIds)
  }

  function addEnemyHitFeedback(enemyId: string, damage: number) {
    const markers = Array.from({ length: Math.max(1, damage) }).map(() => {
      const markerId = Date.now() + Math.random()
      return {
        id: markerId,
        enemyId,
        x: 18 + Math.random() * 64,
        y: 18 + Math.random() * 64,
      }
    })

    setEnemyHitMarkers((currentMarkers) => [...currentMarkers, ...markers])
    for (const marker of markers) {
      const timeoutId = window.setTimeout(() => {
        setEnemyHitMarkers((currentMarkers) =>
          currentMarkers.filter((candidate) => candidate.id !== marker.id),
        )
      }, HIT_MARKER_DURATION_MS)
      hitMarkerTimeoutsRef.current.push(timeoutId)
    }

    setHitFlashEnemyIds((currentIds) =>
      currentIds.includes(enemyId) ? currentIds : [...currentIds, enemyId],
    )
    const flashTimeoutId = window.setTimeout(() => {
      setHitFlashEnemyIds((currentIds) =>
        currentIds.filter((candidate) => candidate !== enemyId),
      )
    }, HIT_FLASH_DURATION_MS)
    hitFlashTimeoutsRef.current.push(flashTimeoutId)
  }

  function damageEnemy(enemyId: string, damage: number) {
    const target = enemies.find((enemy) => enemy.id === enemyId && enemy.health > 0)
    if (!target) return null

    const nextHealth = Math.max(0, target.health - damage)
    addEnemyHitFeedback(enemyId, damage)
    setEnemies((currentEnemies) =>
      currentEnemies.map((enemy) =>
        enemy.id === enemyId ? { ...enemy, health: nextHealth } : enemy,
      ),
    )

    if (nextHealth <= 0) {
      const timeoutId = window.setTimeout(() => {
        setEnemies((currentEnemies) =>
          currentEnemies.filter((enemy) => enemy.id !== enemyId),
        )
        setEnemyHitMarkers((currentMarkers) =>
          currentMarkers.filter((marker) => marker.enemyId !== enemyId),
        )
        setHitFlashEnemyIds((currentIds) =>
          currentIds.filter((candidate) => candidate !== enemyId),
        )
      }, DEFEATED_ENEMY_CLEANUP_MS)
      defeatedEnemyTimeoutsRef.current.push(timeoutId)
    }

    return nextHealth
  }

  function getActivePlayerPosition() {
    return activePane === 'left' ? leftPlayer : rightPlayer
  }

  function triggerPlayerAttackFlash() {
    setAttackFlashPane(activePane)
    setAttackFlashId((currentId) => currentId + 1)
    if (playerAttackFlashTimeoutRef.current !== null) {
      window.clearTimeout(playerAttackFlashTimeoutRef.current)
    }
    playerAttackFlashTimeoutRef.current = window.setTimeout(() => {
      playerAttackFlashTimeoutRef.current = null
      setAttackFlashPane(null)
      setAttackFlashId(0)
    }, 220)
  }

  function attackAdjacentEnemy() {
    triggerPlayerAttackFlash()

    const playerPosition = getActivePlayerPosition()
    const target = enemies.find((enemy) =>
      enemy.health > 0 &&
      enemy.pane === activePane &&
      isAdjacent(enemy.position, playerPosition),
    )

    if (!target) {
      setMessage('No adjacent mouse. Move next to a mouse and press E.')
      return
    }

    const nextHealth = damageEnemy(target.id, VIM_ATTACK_DAMAGE)
    setMessage(
      nextHealth && nextHealth > 0
        ? `You strike the mouse. ${nextHealth} health remains.`
        : 'You strike down the mouse.',
    )
  }

  function isClearBombLane(start: Position, target: Position) {
    if (start.x !== target.x && start.y !== target.y) return false

    const step = {
      x: Math.sign(target.x - start.x),
      y: Math.sign(target.y - start.y),
    }
    let cursor = { x: start.x + step.x, y: start.y + step.y }

    while (!isSamePosition(cursor, target)) {
      if (isPaneWall(currentRoom, activePane, cursor)) return false
      cursor = { x: cursor.x + step.x, y: cursor.y + step.y }
    }

    return true
  }

  function startBombCooldown() {
    setIsBombReady(false)
    if (bombCooldownTimeoutRef.current !== null) {
      window.clearTimeout(bombCooldownTimeoutRef.current)
    }
    bombCooldownTimeoutRef.current = window.setTimeout(() => {
      bombCooldownTimeoutRef.current = null
      setIsBombReady(true)
    }, BOMB_RECHARGE_DELAY_MS)
  }

  function throwBomb() {
    if (!isBombReady) {
      setMessage('Bomb is recharging.')
      return
    }

    const playerPosition = getActivePlayerPosition()
    const target = enemies
      .filter((enemy) =>
        enemy.health > 0 &&
        enemy.pane === activePane &&
        isClearBombLane(playerPosition, enemy.position),
      )
      .sort((first, second) => {
        const firstDistance =
          Math.abs(first.position.x - playerPosition.x) +
          Math.abs(first.position.y - playerPosition.y)
        const secondDistance =
          Math.abs(second.position.x - playerPosition.x) +
          Math.abs(second.position.y - playerPosition.y)
        return firstDistance - secondDistance
      })[0]

    if (!target) {
      setMessage('No mouse in a clear bomb lane.')
      return
    }

    damageEnemy(target.id, BOMB_DAMAGE)
    startBombCooldown()
    setMessage('You throw a bomb. The mouse is blasted down.')
  }

  useEffect(() => {
    playerHealthRef.current = playerHealth
  }, [playerHealth])

  useEffect(() => {
    activePaneRef.current = activePane
    leftPlayerRef.current = leftPlayer
    rightPlayerRef.current = rightPlayer
    enemiesRef.current = enemies
  }, [activePane, enemies, leftPlayer, rightPlayer])

  useEffect(() => () => clearEnemyTimers(), [])

  useEffect(() => {
    if (hasEscaped || isDead) return

    enemyMoveIntervalRef.current = window.setInterval(
      moveEnemies,
      NORMAL_ENEMY_MOVE_INTERVAL_MS,
    )

    return () => {
      if (enemyMoveIntervalRef.current !== null) {
        window.clearInterval(enemyMoveIntervalRef.current)
        enemyMoveIntervalRef.current = null
      }
    }
  }, [currentRoom, hasEscaped, isDead, leftPlayer, rightPlayer])

  useEffect(() => {
    if (hasEscaped || isDead || enemyAttackTimeoutRef.current !== null) return

    const adjacentEnemies = getActivePaneAdjacentEnemies(enemies, activePane)
    if (adjacentEnemies.length === 0) return
    setChargingEnemies(adjacentEnemies)

    enemyAttackTimeoutRef.current = window.setTimeout(() => {
      enemyAttackTimeoutRef.current = null
      const attackingEnemies = getActivePaneAdjacentEnemies()
      setChargingEnemies([])
      if (attackingEnemies.length === 0) return

      const nextHealth = Math.max(0, playerHealthRef.current - 1)
      playerHealthRef.current = nextHealth
      setPlayerHealth(nextHealth)

      if (nextHealth <= 0) {
        resetSplitHall('A mouse catches you. The Split Hall resets.')
        return
      }

      setMessage('A nearby mouse strikes you. You lose 1 health.')
    }, RAT_REPRISAL_COOLDOWN_MS)

  }, [activePane, enemies, hasEscaped, isDead, leftPlayer, rightPlayer])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()

      if (isDead) {
        resetSplitHall('The Split Hall resets after the guard catches you.')
        return
      }

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

      if (event.key.toLowerCase() === 'e') {
        attackAdjacentEnemy()
        return
      }

      if (event.key.toLowerCase() === 'w') {
        throwBomb()
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

      if (getEnemyAt(activePane, nextPlayer, enemies, false)) {
        setMessage('A mouse blocks that route.')
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
            clearEnemyTimers()
            setHasEscaped(true)
            setMessage('The panes line up. The Split Hall is solved.')
            return
          }

          clearEnemyTimers()
          setRoomIndex((current) => current + 1)
          setActivePane('left')
          setLeftPlayer(nextRoom.leftStart)
          setRightPlayer(nextRoom.rightStart)
          setEnemies(getInitialEnemies(nextRoom))
          setIsDoorOpen(false)
          setHasPickedUpKey(false)
          setPlayerHealth(playerMaxHealth)
          playerHealthRef.current = playerMaxHealth
          setIsBombReady(true)
          setMessage(`You enter ${nextRoom.name}.`)
          return
        }
      }

      setMessage(`Moved in the ${activePane} pane.`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePane, currentRoom, enemies, hasEscaped, hasPickedUpKey, isBombReady, isDead, isDoorOpen, isPrefixArmed, leftPlayer, rightPlayer, roomIndex])

  function getPaneTiles(pane: PaneId): TmuxTile[][] {
    const activePlayer = pane === 'left' ? leftPlayer : rightPlayer
    const layout = getPaneLayout(currentRoom, pane)

    return Array.from({ length: roomHeight }, (_, y) =>
      Array.from({ length: roomWidth }, (_, x) => {
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

        const enemy = getEnemyAt(pane, position)
        if (enemy) {
          return {
            label: enemy.health > 0 ? enemy.label : 'defeated mouse',
            sprite: enemy.health > 0 ? enemy.sprite : 'rat-dead',
            enemyId: enemy.id,
          }
        }

        if (layout[y]?.[x] === 'K') {
          return { label: 'floor', sprite: 'floor' }
        }

        return { label: 'floor', sprite: 'floor' }
      }),
    )
  }

  const leftPaneTiles = useMemo(
    () => getPaneTiles('left'),
    [currentRoom, enemies, hasPickedUpKey, leftPlayer, roomHeight, roomWidth],
  )
  const rightPaneTiles = useMemo(
    () => getPaneTiles('right'),
    [currentRoom, enemies, isDoorOpen, rightPlayer, roomHeight, roomWidth],
  )

  function renderPane(pane: PaneId, title: string, tiles: TmuxTile[][]) {
    return (
      <div className={`tmux-pane ${activePane === pane ? 'tmux-pane--active' : ''}`}>
        <span className="tmux-pane-title">{title}</span>
        <div className="tmux-pane-map" aria-label={`${title} map`}>
          {tiles.map((row, rowIndex) => (
            <div
              key={`${pane}-${rowIndex}`}
              className="map-row tmux-map-row"
              style={paneGridStyle}
            >
              {row.map((tile, cellIndex) => (
                (() => {
                  const hitDots = tile.enemyId ? getEnemyHitDots(tile.enemyId) : []
                  const hitClass =
                    tile.enemyId && hitFlashEnemyIds.includes(tile.enemyId)
                      ? ' map-cell--rat-hit'
                      : ''
                  const chargeClass =
                    tile.enemyId && chargingEnemyIds.includes(tile.enemyId)
                      ? ' map-cell--rat-attack-source'
                      : ''
                  const attackFlashClass =
                    tile.sprite === 'player' && attackFlashPane === pane
                      ? ` map-cell--player-attack map-cell--player-attack-${attackFlashId % 2}`
                      : ''

                  return (
                    <span
                      key={`${pane}-${rowIndex}-${cellIndex}`}
                      className={`map-cell map-cell--${tile.sprite}${hitClass}${chargeClass}${attackFlashClass}`}
                      aria-label={tile.label}
                      role="img"
                    >
                      {hitDots.map((dot) => (
                        <span
                          key={dot.id}
                          className="enemy-hit-dot"
                          style={
                            {
                              '--enemy-hit-dot-x': `${dot.x}%`,
                              '--enemy-hit-dot-y': `${dot.y}%`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </span>
                  )
                })()
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
            {renderPane('left', 'left pane', leftPaneTiles)}
            {renderPane('right', 'right pane', rightPaneTiles)}
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
            <p>Bomb: {isBombReady ? 'ready' : 'recharging'}</p>
            <p>Mode: {difficulty === 'hard' ? 'Hard' : 'Normal'}</p>
          </section>
          <section className="side-section">
            <h2>Controls</h2>
            <p>h j k l move in the active pane.</p>
            <p>b then h/l switches panes.</p>
            <p>Y yanks a nearby key.</p>
            <p>E strikes an adjacent guard.</p>
            <p>W throws an unlimited bomb with recharge.</p>
          </section>
        </aside>
      </section>
      <StatusBar
        mode="normal"
        message={message}
        commandInput=""
        isCommandOpen={false}
        playerHealth={playerHealth}
        levelMeta={levelMeta}
      />
    </section>
  )
}
