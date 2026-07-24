import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { playerMaxHealth } from '../game/level'
import type { LevelMeta } from '../game/levels'
import type { Position } from '../game/types'
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

type TmuxEnemyKind = 'rusher' | 'sniper' | 'grenadier' | 'warden'

type TmuxEnemyTile = {
  label: string
  sprite: string
  health: number
  kind: TmuxEnemyKind
}

type PaneEnemy = {
  id: string
  pane: PaneId
  position: Position
  label: string
  sprite: string
  health: number
  kind: TmuxEnemyKind
  nextShotAt?: number
}

type EnemyHitMarker = {
  id: number
  enemyId: string
  x: number
  y: number
}

type PanePosition = {
  pane: PaneId
  position: Position
}

type BombAnimation = PanePosition & {
  phase: 'flying' | 'exploding'
  start: Position
  end: Position
  isTargetedKill?: boolean
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

const NORMAL_ENEMY_MOVE_INTERVAL_MS = 1000
const RAT_REPRISAL_COOLDOWN_MS = 310
const BOMB_RECHARGE_DELAY_MS = 2000
const BOMB_THROW_RANGE = 2
const BOMB_BLAST_RADIUS = 1
const BOMB_FLIGHT_DURATION_MS = 380
const BOMB_EXPLOSION_DURATION_MS = 250
const VIM_ATTACK_DAMAGE = 1
const BOMB_DAMAGE = 3
const SNIPER_RANGE = 7
const SNIPER_COOLDOWN_MS = 10400
const GRENADIER_RANGE = 7
const GRENADIER_COOLDOWN_MS = 12800
const WARDEN_RANGE = 8
const WARDEN_COOLDOWN_MS = 4200
const WARDEN_DAMAGE = 2
const RUSHER_DAMAGE = 2
const RUSHER_MOVE_STEPS = 2
const HIT_MARKER_DURATION_MS = 1000
const HIT_FLASH_DURATION_MS = 240
const DEFEATED_ENEMY_CLEANUP_MS = 180
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

function isOrthogonallyAligned(first: Position, second: Position) {
  return first.x === second.x || first.y === second.y
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

function getEnemyTile(cell: string): TmuxEnemyTile | null {
  if (cell === 'R') return { label: 'rusher mouse', sprite: 'rat-rusher', health: 2, kind: 'rusher' }
  if (cell === 'S') return { label: 'sniper mouse', sprite: 'rat-sniper', health: 3, kind: 'sniper' }
  if (cell === 'G') return { label: 'grenadier mouse', sprite: 'rat-grenadier', health: 3, kind: 'grenadier' }
  if (cell === 'W') return { label: 'warden mouse', sprite: 'rat-warden', health: 4, kind: 'warden' }

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
          health: enemyTile.health,
          kind: enemyTile.kind,
          nextShotAt: enemyTile.kind === 'rusher' ? undefined : 0,
        })
      })
    })
  }

  return enemies
}

function delayRangedEnemiesForPane(
  enemyState: PaneEnemy[],
  pane: PaneId,
  now = Date.now(),
) {
  return enemyState.map((enemy) =>
    enemy.pane === pane && isRangedEnemy(enemy) && enemy.health > 0
      ? { ...enemy, nextShotAt: now + getEnemyCooldownMs(enemy) }
      : enemy,
  )
}

function getEnemyRange(enemy: PaneEnemy) {
  if (enemy.kind === 'sniper') return SNIPER_RANGE
  if (enemy.kind === 'grenadier') return GRENADIER_RANGE
  if (enemy.kind === 'warden') return WARDEN_RANGE

  return 0
}

function getEnemyCooldownMs(enemy: PaneEnemy) {
  if (enemy.kind === 'sniper') return SNIPER_COOLDOWN_MS
  if (enemy.kind === 'grenadier') return GRENADIER_COOLDOWN_MS
  if (enemy.kind === 'warden') return WARDEN_COOLDOWN_MS

  return 0
}

function getEnemyDamage(enemy: PaneEnemy) {
  if (enemy.kind === 'rusher') return RUSHER_DAMAGE
  if (enemy.kind === 'warden') return WARDEN_DAMAGE

  return 1
}

function isRangedEnemy(enemy: PaneEnemy) {
  return enemy.kind === 'sniper' || enemy.kind === 'grenadier' || enemy.kind === 'warden'
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
  const [enemies, setEnemies] = useState<PaneEnemy[]>(() =>
    delayRangedEnemiesForPane(getInitialEnemies(currentRoom), 'left'),
  )
  const [enemyHitMarkers, setEnemyHitMarkers] = useState<EnemyHitMarker[]>([])
  const [hitFlashEnemyIds, setHitFlashEnemyIds] = useState<string[]>([])
  const [, setChargingEnemyIds] = useState<string[]>([])
  const [playerHealth, setPlayerHealth] = useState(playerMaxHealth)
  const [isPrefixArmed, setIsPrefixArmed] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(false)
  const [hasPickedUpKey, setHasPickedUpKey] = useState(false)
  const [isDead, setIsDead] = useState(false)
  const [hasEscaped, setHasEscaped] = useState(false)
  const [isBombReady, setIsBombReady] = useState(true)
  const [bombCooldownProgress, setBombCooldownProgress] = useState(1)
  const [bombAnimation, setBombAnimation] = useState<BombAnimation | null>(null)
  const [bombPulseCells, setBombPulseCells] = useState<PanePosition[]>([])
  const [isAttackCharging, setIsAttackCharging] = useState(false)
  const [attackChargeLevel, setAttackChargeLevel] = useState(0)
  const [attackFlashPane, setAttackFlashPane] = useState<PaneId | null>(null)
  const [attackFlashId, setAttackFlashId] = useState(0)
  const [message, setMessage] = useState('The Split Hall waits for a pane command.')
  const enemyMoveIntervalRef = useRef<number | null>(null)
  const enemyAttackTimeoutRef = useRef<number | null>(null)
  const bombCooldownTimeoutRef = useRef<number | null>(null)
  const bombCooldownIntervalRef = useRef<number | null>(null)
  const bombFlightTimeoutRef = useRef<number | null>(null)
  const bombImpactTimeoutRef = useRef<number | null>(null)
  const bombPulseTimeoutRef = useRef<number | null>(null)
  const attackChargeIntervalRef = useRef<number | null>(null)
  const attackChargeStartedAtRef = useRef<number | null>(null)
  const isAttackChargingRef = useRef(false)
  const playerAttackFlashTimeoutRef = useRef<number | null>(null)
  const hitMarkerTimeoutsRef = useRef<number[]>([])
  const hitFlashTimeoutsRef = useRef<number[]>([])
  const defeatedEnemyTimeoutsRef = useRef<number[]>([])
  const leftPaneMapRef = useRef<HTMLDivElement | null>(null)
  const rightPaneMapRef = useRef<HTMLDivElement | null>(null)
  const playerHealthRef = useRef(playerMaxHealth)
  const activePaneRef = useRef<PaneId>('left')
  const leftPlayerRef = useRef(currentRoom.leftStart)
  const rightPlayerRef = useRef(currentRoom.rightStart)
  const enemiesRef = useRef<PaneEnemy[]>([])
  const chargingEnemyIdsRef = useRef<Set<string>>(new Set())
  const isBombAnimatingRef = useRef(false)
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
    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
      bombCooldownIntervalRef.current = null
    }
    if (bombFlightTimeoutRef.current !== null) {
      window.clearTimeout(bombFlightTimeoutRef.current)
      bombFlightTimeoutRef.current = null
    }
    if (bombImpactTimeoutRef.current !== null) {
      window.clearTimeout(bombImpactTimeoutRef.current)
      bombImpactTimeoutRef.current = null
    }
    if (bombPulseTimeoutRef.current !== null) {
      window.clearTimeout(bombPulseTimeoutRef.current)
      bombPulseTimeoutRef.current = null
    }
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
      attackChargeIntervalRef.current = null
    }
    attackChargeStartedAtRef.current = null
    isAttackChargingRef.current = false
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
    if (enemyAttackTimeoutRef.current === null) {
      setChargingEnemyIds([])
      chargingEnemyIdsRef.current = new Set()
    }
    if (playerAttackFlashTimeoutRef.current !== null) {
      window.clearTimeout(playerAttackFlashTimeoutRef.current)
      playerAttackFlashTimeoutRef.current = null
    }
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
      attackChargeIntervalRef.current = null
    }
    attackChargeStartedAtRef.current = null
    isAttackChargingRef.current = false
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
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
    setEnemies(delayRangedEnemiesForPane(getInitialEnemies(firstRoom), 'left'))
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
    setBombCooldownProgress(1)
    setBombAnimation(null)
    setBombPulseCells([])
    isBombAnimatingRef.current = false
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
    setAttackFlashPane(null)
    setAttackFlashId(0)
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
    setMessage(messageText)
  }

  function clearEnemyAttackTimer() {
    if (enemyAttackTimeoutRef.current !== null) {
      window.clearTimeout(enemyAttackTimeoutRef.current)
      enemyAttackTimeoutRef.current = null
    }
    setChargingEnemies([])
  }

  function switchActivePane(nextPane: PaneId) {
    clearAttackCharge()
    clearEnemyAttackTimer()
    setActivePane(nextPane)
    setIsPrefixArmed(false)
    setEnemies((currentEnemies) => delayRangedEnemiesForPane(currentEnemies, nextPane))
    setMessage(`Active pane: ${nextPane}.`)
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

  function canEnemyMoveTo(
    enemy: PaneEnemy,
    position: Position,
    enemyState: PaneEnemy[],
  ) {
    const playerPosition = enemy.pane === 'left' ? leftPlayerRef.current : rightPlayerRef.current
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

  function hasClearLineOfSight(
    enemy: PaneEnemy,
    target: Position,
    enemyState: PaneEnemy[],
  ) {
    if (!isOrthogonallyAligned(enemy.position, target)) return false

    const xStep = Math.sign(target.x - enemy.position.x)
    const yStep = Math.sign(target.y - enemy.position.y)
    let cursor = {
      x: enemy.position.x + xStep,
      y: enemy.position.y + yStep,
    }

    while (!isSamePosition(cursor, target)) {
      if (isPaneWall(currentRoom, enemy.pane, cursor)) return false
      if (
        enemyState.some((candidate) =>
          candidate.id !== enemy.id &&
          candidate.health > 0 &&
          candidate.pane === enemy.pane &&
          isSamePosition(candidate.position, cursor),
        )
      ) {
        return false
      }

      cursor = {
        x: cursor.x + xStep,
        y: cursor.y + yStep,
      }
    }

    return true
  }

  function canRangedEnemyAttack(
    enemy: PaneEnemy,
    target: Position,
    enemyState: PaneEnemy[],
  ) {
    if (!isRangedEnemy(enemy) || enemy.health <= 0) return false
    if (!isOrthogonallyAligned(enemy.position, target)) return false

    const rangeToTarget = Math.max(
      Math.abs(enemy.position.x - target.x),
      Math.abs(enemy.position.y - target.y),
    )

    return (
      rangeToTarget > 0 &&
      rangeToTarget <= getEnemyRange(enemy) &&
      hasClearLineOfSight(enemy, target, enemyState)
    )
  }

  function moveEnemies() {
    if (isBombAnimatingRef.current) return

    setEnemies((currentEnemies) => {
      const nextEnemies = [...currentEnemies]
      let didMove = false

      for (const enemy of nextEnemies) {
        if (enemy.health <= 0) continue
        if (chargingEnemyIdsRef.current.has(enemy.id)) continue

        const playerPosition = enemy.pane === 'left' ? leftPlayerRef.current : rightPlayerRef.current

        let nextPosition: Position | undefined
        if (enemy.kind === 'rusher') {
          let currentPosition = { ...enemy.position }
          for (let step = 0; step < RUSHER_MOVE_STEPS; step += 1) {
            const currentDistance =
              Math.abs(currentPosition.x - playerPosition.x) +
              Math.abs(currentPosition.y - playerPosition.y)
            const nextStep = getShuffledDirections()
              .map((direction) => ({
                x: currentPosition.x + direction.x,
                y: currentPosition.y + direction.y,
              }))
              .filter((position) => {
                const nextDistance =
                  Math.abs(position.x - playerPosition.x) +
                  Math.abs(position.y - playerPosition.y)
                return nextDistance <= currentDistance
              })
              .find((position) => canEnemyMoveTo(enemy, position, nextEnemies))

            if (!nextStep) break
            currentPosition = nextStep
            nextPosition = nextStep
            if (isAdjacent(currentPosition, playerPosition)) break
          }
        } else {
          nextPosition = getShuffledDirections()
            .map((direction) => ({
              x: enemy.position.x + direction.x,
              y: enemy.position.y + direction.y,
            }))
            .find((position) => canEnemyMoveTo(enemy, position, nextEnemies))
        }

        if (nextPosition && !isSamePosition(nextPosition, enemy.position)) {
          enemy.position = nextPosition
          didMove = true
        }
      }

      return didMove
        ? nextEnemies.map((enemy) => ({ ...enemy, position: { ...enemy.position } }))
        : currentEnemies
    })
  }

  function getActivePaneAttackThreats(
    enemyState = enemiesRef.current,
    pane = activePaneRef.current,
    now = Date.now(),
  ) {
    const playerPosition = pane === 'left' ? leftPlayerRef.current : rightPlayerRef.current

    return enemyState
      .filter((enemy) => {
        if (enemy.health <= 0) return false
        if (enemy.pane !== pane) return false
        if (isAdjacent(enemy.position, playerPosition)) return true

        return (
          isRangedEnemy(enemy) &&
          now >= (enemy.nextShotAt ?? 0) &&
          canRangedEnemyAttack(enemy, playerPosition, enemyState)
        )
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

  function attackAdjacentEnemy(damage = VIM_ATTACK_DAMAGE) {
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

    const nextHealth = damageEnemy(target.id, damage)
    setMessage(
      nextHealth && nextHealth > 0
        ? `You strike the mouse for ${damage} damage. ${nextHealth} health remains.`
        : damage > 1
          ? 'You release a charged strike and drop the mouse.'
          : 'You strike down the mouse.',
    )
  }

  function clearAttackCharge() {
    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
      attackChargeIntervalRef.current = null
    }
    attackChargeStartedAtRef.current = null
    isAttackChargingRef.current = false
    setIsAttackCharging(false)
    setAttackChargeLevel(0)
  }

  function startAttackCharge() {
    if (isAttackChargingRef.current) return

    attackChargeStartedAtRef.current = Date.now()
    isAttackChargingRef.current = true
    setIsAttackCharging(true)
    setAttackChargeLevel(1)

    if (attackChargeIntervalRef.current !== null) {
      window.clearInterval(attackChargeIntervalRef.current)
    }

    attackChargeIntervalRef.current = window.setInterval(() => {
      if (attackChargeStartedAtRef.current === null) return
      const elapsedSeconds = Math.floor((Date.now() - attackChargeStartedAtRef.current) / 1000)
      setAttackChargeLevel(Math.min(3, elapsedSeconds + 1))
    }, 80)
  }

  function releaseAttackCharge() {
    const startedAt = attackChargeStartedAtRef.current
    if (startedAt === null) return

    const chargedDamage = Math.max(1, Math.min(3, Math.floor((Date.now() - startedAt) / 1000) + 1))
    clearAttackCharge()
    attackAdjacentEnemy(chargedDamage)
  }

  function handlePhysicalMouseEnemyClick(enemyId?: string) {
    if (!enemyId || isDead || hasEscaped || isBombAnimatingRef.current) return

    const nextHealth = damageEnemy(enemyId, 1)
    if (nextHealth === null) return

    setMessage(
      nextHealth > 0
        ? `You click the mouse for 1 damage. ${nextHealth} health remains.`
        : 'You click down the mouse.',
    )
  }

  function getOrthogonalLinePositions(start: Position, end: Position, maxDistance: number) {
    if (start.x !== end.x && start.y !== end.y) return []

    const xStep = Math.sign(end.x - start.x)
    const yStep = Math.sign(end.y - start.y)
    const maxSteps = Math.min(
      maxDistance,
      Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)),
    )

    const line: Position[] = []
    for (let step = 1; step <= maxSteps; step += 1) {
      line.push({
        x: start.x + xStep * step,
        y: start.y + yStep * step,
      })
    }

    return line
  }

  function isWithinRadius(first: Position, second: Position, radius: number) {
    return (
      Math.abs(first.x - second.x) <= radius &&
      Math.abs(first.y - second.y) <= radius
    )
  }

  function triggerBombPulse(pane: PaneId, positions: Position[]) {
    const nextCells = positions.map((position) => ({
      pane,
      position: { ...position },
    }))
    setBombPulseCells(nextCells)

    if (bombPulseTimeoutRef.current !== null) {
      window.clearTimeout(bombPulseTimeoutRef.current)
    }
    bombPulseTimeoutRef.current = window.setTimeout(() => {
      bombPulseTimeoutRef.current = null
      setBombPulseCells([])
    }, 620)
  }

  function clearBombAnimation() {
    if (bombFlightTimeoutRef.current !== null) {
      window.clearTimeout(bombFlightTimeoutRef.current)
      bombFlightTimeoutRef.current = null
    }
    if (bombImpactTimeoutRef.current !== null) {
      window.clearTimeout(bombImpactTimeoutRef.current)
      bombImpactTimeoutRef.current = null
    }
    isBombAnimatingRef.current = false
    setBombAnimation(null)
  }

  function startBombCooldown() {
    setIsBombReady(false)
    setBombCooldownProgress(0)
    if (bombCooldownTimeoutRef.current !== null) {
      window.clearTimeout(bombCooldownTimeoutRef.current)
    }
    if (bombCooldownIntervalRef.current !== null) {
      window.clearInterval(bombCooldownIntervalRef.current)
    }
    const readyAt = Date.now() + BOMB_RECHARGE_DELAY_MS
    bombCooldownIntervalRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, readyAt - Date.now())
      const nextProgress = 1 - remainingMs / BOMB_RECHARGE_DELAY_MS
      setBombCooldownProgress(Math.max(0, Math.min(1, nextProgress)))

      if (remainingMs <= 0 && bombCooldownIntervalRef.current !== null) {
        window.clearInterval(bombCooldownIntervalRef.current)
        bombCooldownIntervalRef.current = null
        setBombCooldownProgress(1)
      }
    }, 50)
    bombCooldownTimeoutRef.current = window.setTimeout(() => {
      bombCooldownTimeoutRef.current = null
      setIsBombReady(true)
      setBombCooldownProgress(1)
    }, BOMB_RECHARGE_DELAY_MS)
  }

  function throwBomb() {
    if (isBombAnimatingRef.current) {
      return
    }

    if (!isBombReady) {
      setMessage('Bomb is recharging.')
      return
    }

    const playerPosition = getActivePlayerPosition()
    const closestTargets = enemies
      .filter((enemy) => enemy.health > 0 && enemy.pane === activePane)
      .map((enemy) => ({
        ...enemy.position,
        id: enemy.id,
        distance:
          Math.abs(enemy.position.x - playerPosition.x) +
          Math.abs(enemy.position.y - playerPosition.y),
      }))

    const throwPlans = movementDirections
      .map((direction) => {
        const throwTile = {
          x: playerPosition.x + direction.x,
          y: playerPosition.y + direction.y,
        }
        const explosionTile = {
          x: playerPosition.x + direction.x * BOMB_THROW_RANGE,
          y: playerPosition.y + direction.y * BOMB_THROW_RANGE,
        }
        const blocked = isPaneWall(currentRoom, activePane, throwTile)
        const effectiveExplosionTile = isPaneWall(currentRoom, activePane, explosionTile)
          ? throwTile
          : explosionTile
        const distanceTargets = closestTargets.length > 0
          ? closestTargets
          : [
              {
                id: '',
                x: effectiveExplosionTile.x,
                y: effectiveExplosionTile.y,
                distance: Number.POSITIVE_INFINITY,
              },
            ]
        const distanceToClosestMouse = distanceTargets.reduce(
          (bestDistance, target) =>
            Math.min(
              bestDistance,
              Math.abs(target.x - effectiveExplosionTile.x) +
                Math.abs(target.y - effectiveExplosionTile.y),
            ),
          Infinity,
        )
        const killTargets = distanceTargets.filter((target) =>
          isWithinRadius(target, effectiveExplosionTile, BOMB_BLAST_RADIUS),
        )
        const willHitMouse = killTargets.length > 0
        const targetedKill = willHitMouse
          ? killTargets.reduce((closest, current) => {
              const closestDistance =
                Math.abs(closest.x - effectiveExplosionTile.x) +
                Math.abs(closest.y - effectiveExplosionTile.y)
              const currentDistance =
                Math.abs(current.x - effectiveExplosionTile.x) +
                Math.abs(current.y - effectiveExplosionTile.y)
              return currentDistance < closestDistance ? current : closest
            }, killTargets[0] as (typeof killTargets)[number])
          : null

        return {
          effectiveExplosionTile,
          blocked,
          distanceToClosestMouse,
          willHitMouse,
          willHaveTarget: closestTargets.length > 0,
          targetedKill,
        }
      })
      .filter((plan) => !plan.blocked)

    if (throwPlans.length === 0) {
      setMessage('The bomb cannot reach that far through a wall.')
      return
    }

    const bestPlan = throwPlans.reduce((best, current) => {
      if (current.willHitMouse && !best.willHitMouse) return current
      if (!current.willHitMouse && best.willHitMouse) return best
      if (current.distanceToClosestMouse < best.distanceToClosestMouse) return current
      return best
    }, throwPlans[0] as (typeof throwPlans)[number])

    if (!bestPlan.willHaveTarget) {
      setMessage('No mice in range. The bomb flies and explodes at the nearest open tile.')
    }

    const bombImpactTile = bestPlan.targetedKill ?? bestPlan.effectiveExplosionTile
    const targetTile = bestPlan.targetedKill ? { ...bestPlan.targetedKill } : null
    const bombPath = getOrthogonalLinePositions(playerPosition, bestPlan.effectiveExplosionTile, BOMB_THROW_RANGE)

    triggerBombPulse(activePane, [playerPosition, ...bombPath, bombImpactTile])
    startBombCooldown()
    clearBombAnimation()
    isBombAnimatingRef.current = true
    setBombAnimation({
      pane: activePane,
      position: { ...playerPosition },
      phase: 'flying',
      start: { ...playerPosition },
      end: bombImpactTile,
      isTargetedKill: targetTile !== null,
    })
    setMessage('You throw a bomb toward the nearest threat.')

    const applyExplosion = () => {
      setBombAnimation((current) =>
        current
          ? {
              ...current,
              phase: 'exploding',
            }
          : current,
      )

      const currentEnemies = enemiesRef.current
      const nearbyEnemies = currentEnemies.filter((enemy) => {
        if (enemy.health <= 0 || enemy.pane !== activePane) return false
        if (targetTile !== null && isSamePosition(enemy.position, targetTile)) return true
        return isWithinRadius(enemy.position, bombImpactTile, BOMB_BLAST_RADIUS)
      })

      if (nearbyEnemies.length > 0) {
        const nearbyEnemyIds = new Set(nearbyEnemies.map((enemy) => enemy.id))
        for (const enemy of nearbyEnemies) {
          addEnemyHitFeedback(enemy.id, BOMB_DAMAGE)
        }
        setEnemies((currentEnemies) =>
          currentEnemies.map((enemy) =>
            nearbyEnemyIds.has(enemy.id)
              ? { ...enemy, health: Math.max(0, enemy.health - BOMB_DAMAGE) }
              : enemy,
          ),
        )

        const cleanupTimeoutId = window.setTimeout(() => {
          setEnemies((currentEnemies) =>
            currentEnemies.filter((enemy) => !(nearbyEnemyIds.has(enemy.id) && enemy.health <= 0)),
          )
          setEnemyHitMarkers((currentMarkers) =>
            currentMarkers.filter((marker) => !nearbyEnemyIds.has(marker.enemyId)),
          )
          setHitFlashEnemyIds((currentIds) =>
            currentIds.filter((enemyId) => !nearbyEnemyIds.has(enemyId)),
          )
        }, DEFEATED_ENEMY_CLEANUP_MS)
        defeatedEnemyTimeoutsRef.current.push(cleanupTimeoutId)
      } else {
        setMessage('The bomb goes off in silence.')
      }

      setMessage('The bomb explodes!')
      bombImpactTimeoutRef.current = window.setTimeout(() => {
        clearBombAnimation()
      }, BOMB_EXPLOSION_DURATION_MS)
    }

    bombFlightTimeoutRef.current = window.setTimeout(() => {
      applyExplosion()
    }, BOMB_FLIGHT_DURATION_MS)
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

    moveEnemies()
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
  }, [currentRoom, hasEscaped, isDead])

  useEffect(() => {
    if (hasEscaped || isDead || enemyAttackTimeoutRef.current !== null) return

    const attackThreats = getActivePaneAttackThreats(enemies, activePane)
    if (attackThreats.length === 0) return
    setChargingEnemies(attackThreats)

    enemyAttackTimeoutRef.current = window.setTimeout(() => {
      enemyAttackTimeoutRef.current = null
      const now = Date.now()
      const attackingEnemies = getActivePaneAttackThreats(enemiesRef.current, activePaneRef.current, now)
      setChargingEnemies([])
      if (attackingEnemies.length === 0) return

      const totalDamage = attackingEnemies.reduce(
        (damage, enemy) => damage + getEnemyDamage(enemy),
        0,
      )
      const nextHealth = Math.max(0, playerHealthRef.current - totalDamage)
      playerHealthRef.current = nextHealth
      setPlayerHealth(nextHealth)
      setEnemies((currentEnemies) =>
        currentEnemies.map((enemy) =>
          attackingEnemies.some((attacker) => attacker.id === enemy.id) && isRangedEnemy(enemy)
            ? { ...enemy, nextShotAt: now + getEnemyCooldownMs(enemy) }
            : enemy,
        ),
      )

      if (nextHealth <= 0) {
        resetSplitHall('A mouse attack catches you. The Split Hall resets.')
        return
      }

      const attackerNames = Array.from(new Set(attackingEnemies.map((enemy) => enemy.label))).join(', ')
      setMessage(`${attackerNames} strike for ${totalDamage} damage.`)
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
      if (isBombAnimatingRef.current) return

      if (isPrefixArmed) {
        if (event.key === 'h' || event.key === 'ArrowLeft') {
          switchActivePane('left')
          return
        }

        if (event.key === 'l' || event.key === 'ArrowRight') {
          switchActivePane('right')
          return
        }

        setIsPrefixArmed(false)
        setMessage('tmux prefix cleared.')
        return
      }

      if (event.key === 'b') {
        clearAttackCharge()
        setIsPrefixArmed(true)
        setMessage('tmux prefix armed. Press h or l to choose a pane.')
        return
      }

      if (event.key.toLowerCase() === 'e') {
        if (!event.repeat) {
          startAttackCharge()
        }
        return
      }

      if (event.key.toLowerCase() === 'w') {
        clearAttackCharge()
        throwBomb()
        return
      }

      if (event.key.toLowerCase() === 'y') {
        clearAttackCharge()
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
            clearAttackCharge()
            setHasEscaped(true)
            setMessage('The panes line up. The Split Hall is solved.')
            return
          }

          clearEnemyTimers()
          clearAttackCharge()
          setRoomIndex((current) => current + 1)
          setActivePane('left')
          setLeftPlayer(nextRoom.leftStart)
          setRightPlayer(nextRoom.rightStart)
          setEnemies(delayRangedEnemiesForPane(getInitialEnemies(nextRoom), 'left'))
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

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'e') return
      if (!isAttackChargingRef.current) return

      event.preventDefault()
      releaseAttackCharge()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
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

  const enemyHitMarkersByEnemyId = useMemo(() => {
    const markersByEnemyId = new Map<string, EnemyHitMarker[]>()

    for (const marker of enemyHitMarkers) {
      const markers = markersByEnemyId.get(marker.enemyId)
      if (markers) {
        markers.push(marker)
      } else {
        markersByEnemyId.set(marker.enemyId, [marker])
      }
    }

    return markersByEnemyId
  }, [enemyHitMarkers])

  const hitFlashEnemyIdSet = useMemo(
    () => new Set(hitFlashEnemyIds),
    [hitFlashEnemyIds],
  )

  const bombPulseCellKeys = useMemo(
    () =>
      new Set(
        bombPulseCells.map(
          (cell) => `${cell.pane}:${cell.position.x},${cell.position.y}`,
        ),
      ),
    [bombPulseCells],
  )

  function getPaneBombAnimation(pane: PaneId) {
    if (!bombAnimation || bombAnimation.pane !== pane) return null

    const mapElement = pane === 'left' ? leftPaneMapRef.current : rightPaneMapRef.current
    const firstCell = mapElement?.querySelector<HTMLElement>('.map-cell') ?? null
    const cellSize = firstCell?.getBoundingClientRect().width ?? 28
    const mapStyles = mapElement ? window.getComputedStyle(mapElement) : null
    const cellGap = mapStyles ? Number.parseFloat(mapStyles.gap) || 0 : 0
    const cellStep = cellSize + cellGap

    return {
      phase: bombAnimation.phase,
      fromPixels: {
        x: bombAnimation.start.x * cellStep,
        y: bombAnimation.start.y * cellStep,
      },
      toPixels: {
        x: bombAnimation.end.x * cellStep,
        y: bombAnimation.end.y * cellStep,
      },
      isTargetedKill: bombAnimation.isTargetedKill,
    }
  }

  function renderPane(pane: PaneId, title: string, tiles: TmuxTile[][]) {
    const visibleBombAnimation = getPaneBombAnimation(pane)

    return (
      <div className={`tmux-pane ${activePane === pane ? 'tmux-pane--active' : ''}`}>
        <span className="tmux-pane-title">{title}</span>
        <div
          ref={pane === 'left' ? leftPaneMapRef : rightPaneMapRef}
          className="tmux-pane-map"
          aria-label={`${title} map`}
        >
          {tiles.map((row, rowIndex) => (
            <div
              key={`${pane}-${rowIndex}`}
              className="map-row tmux-map-row"
              style={paneGridStyle}
            >
              {row.map((tile, cellIndex) => (
                (() => {
                  const hitDots = tile.enemyId
                    ? enemyHitMarkersByEnemyId.get(tile.enemyId) ?? []
                    : []
                  const hitClass =
                    tile.enemyId && hitFlashEnemyIdSet.has(tile.enemyId)
                      ? ' map-cell--rat-hit'
                      : ''
                  const attackFlashClass =
                    tile.sprite === 'player' && attackFlashPane === pane
                      ? ` map-cell--player-attack map-cell--player-attack-${attackFlashId % 2}`
                      : ''
                  const chargeClass =
                    tile.sprite === 'player' && activePane === pane && isAttackCharging
                      ? ` map-cell--charge-ready map-cell--charge-level-${Math.max(1, Math.min(3, attackChargeLevel))}`
                      : ''
                  const bombPulseClass = bombPulseCellKeys.has(`${pane}:${cellIndex},${rowIndex}`)
                    ? ' map-cell--ability-bomb'
                    : ''

                  return (
                    <span
                      key={`${pane}-${rowIndex}-${cellIndex}`}
                      className={`map-cell map-cell--${tile.sprite}${hitClass}${attackFlashClass}${chargeClass}${bombPulseClass}`}
                      aria-label={tile.label}
                      role="img"
                      onClick={() => handlePhysicalMouseEnemyClick(tile.enemyId)}
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
          {visibleBombAnimation && (
            <span
              className={`map-bomb-animation ${
                visibleBombAnimation.phase === 'flying' &&
                visibleBombAnimation.isTargetedKill
                  ? 'map-bomb-animation--flying-kill'
                  : `map-bomb-animation--${visibleBombAnimation.phase}`
              }`}
              aria-hidden
              style={
                {
                  '--bomb-start-x': `${visibleBombAnimation.fromPixels.x}px`,
                  '--bomb-start-y': `${visibleBombAnimation.fromPixels.y}px`,
                  '--bomb-end-x': `${visibleBombAnimation.toPixels.x}px`,
                  '--bomb-end-y': `${visibleBombAnimation.toPixels.y}px`,
                } as CSSProperties
              }
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="game-screen">
      <section className="main-panel" aria-label={`${levelMeta.roomName} tmux puzzle`}>
        <div className="tmux-level">
          <div className="tmux-main-status" aria-label="Split Hall bomb status">
            <span
              className="bomb-cooldown bomb-cooldown--compact"
              aria-label={bombCooldownProgress >= 1 ? 'Bomb ready' : 'Bomb recharging'}
              title={isBombReady ? 'Bomb ready' : 'Bomb recharging'}
              style={{ '--bomb-cooldown-progress': bombCooldownProgress } as CSSProperties}
            />
          </div>
          <div className="tmux-pane-grid" aria-label="Tmux split panes">
            {renderPane('left', 'left pane', leftPaneTiles)}
            {renderPane('right', 'right pane', rightPaneTiles)}
          </div>
        </div>
      </section>
      <section className="side-column">
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
            <p>W to use bomb ability.</p>
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
