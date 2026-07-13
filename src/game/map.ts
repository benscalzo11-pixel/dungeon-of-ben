import type { Position } from './types'

export type SecretRat = Position & {
  kind?: 'normal' | 'sniper' | 'grenadier' | 'mine' | 'warden' | 'stunner' | 'rusher' | 'aura'
  health: number
  maxHealth?: number
  nextShotAt?: number
  nextAttackAt?: number
  nextAuraPulseAt?: number
  stunnedUntil?: number
  defeatedByDinosaur?: boolean
  isBoss?: boolean
  roomTwoRoomKeyReward?: 1 | 2 | 3 | 4
}

const leftDungeonRoom = [
  '#############',
  '#@....#.....#',
  '#.##..#..#..#',
  '#......M.#..#',
  '#..#......#.#',
  '#############',
]

const rightDungeonRoom = [
  '#############',
  '#.....#.....#',
  '#.##..#..#..#',
  '#....#...#..#',
  '#..#......###',
  '#############',
]
const thirdDungeonRoom = [...rightDungeonRoom, ...rightDungeonRoom]
export const rightRoomPushableWall = { x: 16, y: 2 }
export const rightRoomPushableWallDestination = { x: 16, y: 1 }
export const rightRoomChestPosition = { x: 17, y: 3 }
export const rightRoomChestKeyPosition = { x: 16, y: 1 }
export const rightRoomTeleporterPosition = { x: 21, y: 2 }
export const thirdRoomPushableWall = { x: 22, y: -3 }
export const thirdRoomTeleporterPosition = { x: 21, y: -1 }
export const thirdRoomChestPosition = { x: 16, y: -4 }
export const thirdRoomChestKeyPosition = { x: 22, y: -2 }
export const thirdRoomDoorPosition = { x: 16, y: -6 }
export const thirdRoomLifeChestPosition = { x: 17, y: -8 }
export const thirdRoomBombChestPosition = { x: 18, y: -8 }
export const thirdRoomSwordChestPosition = { x: 19, y: -8 }
export const thirdRoomBossTeleporterPosition = { x: 20, y: -8 }
export const vendingMachinePosition = { x: 2, y: 1 }
export const dungeonMap = leftDungeonRoom
export const roomWidth = 13
const roomHeight = dungeonMap.length
const mapBottomY = -10
export const thirdRoomHeight = roomHeight * 2
export const bossRoomWidth = roomWidth * 2
export const bossRoomHeight = roomHeight * 2
export const bossRoomPlayerStartPosition = { x: 1, y: 1 }
export const bossRoomBossPosition = { x: 13, y: 5 }
// User coordinates reference the full map with y origin at the bottom-left block.
// The secret-room entrance you called out at (7,5) is this map wall tile.
export const secretRoomDoorPosition = { x: 7, y: 0 }
export const secretRoomTeleporterPosition = { x: 6, y: -1 }
export const secretRoomDoorKeyRatPosition = { x: 1, y: -3 }
export const dungeonDoorPosition = { x: roomWidth - 1, y: 3 }
export const thirdRoomStartPosition = {
  x: rightRoomTeleporterPosition.x,
  y: -4,
}
export const thirdRoomSupplyRoomStartPosition = {
  x: 18,
  y: -7,
}
function isSecretRoomEntrance(position: Position) {
  return (
    position.x === secretRoomDoorPosition.x &&
    position.y === secretRoomDoorPosition.y
  )
}

export function isSecretRoomTeleporterPosition(position: Position) {
  return (
    position.x === secretRoomTeleporterPosition.x &&
    position.y === secretRoomTeleporterPosition.y
  )
}
export function isRightRoomTeleporterPosition(position: Position) {
  return (
    position.x === rightRoomTeleporterPosition.x &&
    position.y === rightRoomTeleporterPosition.y
  )
}
export function isThirdRoomTeleporterPosition(position: Position) {
  return (
    position.x === thirdRoomTeleporterPosition.x &&
    position.y === thirdRoomTeleporterPosition.y
  )
}
export function isThirdRoomBossTeleporterPosition(position: Position) {
  return (
    position.x === thirdRoomBossTeleporterPosition.x &&
    position.y === thirdRoomBossTeleporterPosition.y
  )
}
export function isThirdRoomDoorPosition(position: Position) {
  return (
    position.x === thirdRoomDoorPosition.x &&
    position.y === thirdRoomDoorPosition.y
  )
}

const secretRoomLayout: string[] = [
  '#############',
  '#...........#',
  '#.###...###.#',
  '#...........#',
  '#...........#',
]
export const secretRoomHeight = secretRoomLayout.length
const secretPocketLayout: string[] = [
  '#############',
  '#.....#######',
  '#.....#######',
  '#.....#######',
  '#.....#######',
]
const pushableWallOriginal: Position = { x: 3, y: -3 }
const pushableWallDestination: Position = { x: 3, y: -4 }
const mapWidth = roomWidth * 3
const thirdRoomMinY = -thirdRoomHeight

function isThirdRoomArea(position: Position) {
  return (
    position.y >= thirdRoomMinY &&
    position.y < 0 &&
    position.x >= roomWidth &&
    position.x < roomWidth * 2
  )
}

function isThirdRoomSupplyRoomArea(position: Position) {
  return (
    position.x >= roomWidth + 3 &&
    position.x <= roomWidth + 7 &&
    position.y >= -9 &&
    position.y <= -7
  )
}

function isThirdRoomSupplyChestOpen(
  position: Position,
  supplyLifeChestOpen: boolean,
  supplyBombChestOpen: boolean,
  supplySwordChestOpen: boolean,
) {
  return (
    (position.x === thirdRoomLifeChestPosition.x &&
      position.y === thirdRoomLifeChestPosition.y &&
      supplyLifeChestOpen) ||
    (position.x === thirdRoomBombChestPosition.x &&
      position.y === thirdRoomBombChestPosition.y &&
      supplyBombChestOpen) ||
    (position.x === thirdRoomSwordChestPosition.x &&
      position.y === thirdRoomSwordChestPosition.y &&
      supplySwordChestOpen)
  )
}

function isSupplyRoomReadyForBoss(
  supplyLifeChestOpen: boolean,
  supplyBombChestOpen: boolean,
  supplySwordChestOpen: boolean,
) {
  return (
    supplyLifeChestOpen &&
    supplyBombChestOpen &&
    supplySwordChestOpen
  )
}

function isAnyThirdRoomArea(position: Position) {
  return isThirdRoomArea(position)
}

function getThirdRoomLocalX(position: Position) {
  return position.x - roomWidth
}

function getThirdRoomCell(position: Position) {
  if (!isAnyThirdRoomArea(position)) {
    return '#'
  }

  const rowIndex = position.y - thirdRoomMinY
  const localX = getThirdRoomLocalX(position)
  const row = thirdDungeonRoom[rowIndex]

  return row?.[localX] ?? '#'
}

function getRatSpriteForState(rat: SecretRat | undefined, isBossFight = false) {
  if (!rat) return null

  if (isBossFight && rat.isBoss) {
    return '🐉'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'sniper') {
    return 'S'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'mine') {
    return 'X'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'warden') {
    return 'W'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'stunner') {
    return 'I'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'rusher') {
    return 'R'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'aura') {
    return 'A'
  }

  if (!rat.isBoss && rat.health > 0 && rat.kind === 'grenadier') {
    return 'G'
  }

  return '🐁'
}

function isSecretWallArea(position: Position) {
  return position.y < 0 && position.y >= -secretRoomHeight
}

function getSecretRoomCell(position: Position) {
  if (!isSecretWallArea(position)) {
    return '#'
  }

  const rowIndex = position.y + secretRoomHeight
  const row = secretRoomLayout[rowIndex]
  if (!row) return '#'

  return row[position.x] ?? '#'
}

function getSecretRoomCellForState(
  position: Position,
  secretWallShifted: boolean,
  secretPocketOpen: boolean,
) {
  const baseCell = getSecretRoomCell(position)

  if (secretPocketOpen) {
    const row = secretPocketLayout[
      position.y + secretRoomHeight
    ]
    return row?.[position.x] ?? '#'
  }

  if (position.x === pushableWallOriginal.x && position.y === pushableWallOriginal.y) {
    return secretWallShifted ? '.' : baseCell
  }

  if (
    position.x === pushableWallDestination.x &&
    position.y === pushableWallDestination.y &&
    secretWallShifted
  ) {
    return '#'
  }

  return baseCell
}

export const startPosition: Position = { x: 1, y: 1 }
export const mousePosition: Position = { x: 7, y: 3 }

export function isVendingMachinePosition(position: Position) {
  return position.x === vendingMachinePosition.x && position.y === vendingMachinePosition.y
}

function getDungeonCell(position: Position) {
  if (position.x < 0 || position.x >= mapWidth) {
    return '#'
  }

  if (position.y < 0 || position.y >= roomHeight) {
    return '#'
  }

  const roomIndex = Math.floor(position.x / roomWidth)
  const localX = position.x - roomIndex * roomWidth
  const roomRows =
    roomIndex === 0
      ? leftDungeonRoom
      : roomIndex === 1
        ? rightDungeonRoom
        : null
  return roomRows?.[position.y]?.[localX] ?? '#'
}

export function isWall(
  position: Position,
  secretRoomKnown = false,
  secretWallShifted = false,
  secretPocketOpen = false,
  secretPocketRatState: SecretRat[] = [],
  isDoorOpen = false,
  isRightRoomKnown = false,
  isThirdRoomKnown = false,
  isRightRoomBlockShifted = false,
  isRightRoomChestOpen = false,
  isSecretRoomDoorOpen = false,
  isThirdRoomBlockShifted = false,
  isThirdRoomChestOpen = false,
  isThirdRoomLifeChestOpen = false,
  isThirdRoomBombChestOpen = false,
  isThirdRoomSwordChestOpen = false,
  isThirdRoomDoorOpen = false,
  isBossFight = false,
  ratPositionLookup?: ReadonlySet<string>,
) {
  void isSecretRoomDoorOpen
  const ratPositionKey = `${position.x},${position.y}`
  if (ratPositionLookup?.has(ratPositionKey)) {
    return true
  }

  if (secretPocketRatState.some((rat) => rat.health > 0 && rat.x === position.x && rat.y === position.y)) {
    return true
  }

  if (isBossFight) {
    if (position.x < 0 || position.x >= bossRoomWidth) {
      return true
    }
    if (position.y < 0 || position.y >= bossRoomHeight) {
      return true
    }
    return (
      position.x === 0 ||
      position.x === bossRoomWidth - 1 ||
      position.y === 0 ||
      position.y === bossRoomHeight - 1
    )
  }

  if (position.x < 0 || position.x >= mapWidth) {
    return true
  }

  if (position.y >= roomHeight || position.y < mapBottomY) {
    return true
  }

  const isInUndiscoveredRightRoom =
    !isRightRoomKnown &&
    position.y >= 0 &&
    position.y < dungeonMap.length &&
    position.x >= roomWidth

  const isInUndiscoveredThirdRoom =
    !isThirdRoomKnown &&
    isAnyThirdRoomArea(position)

  if (isInUndiscoveredRightRoom) {
    if (position.x === roomWidth && position.y === dungeonDoorPosition.y && isDoorOpen) {
      return false
    }

    return true
  }

  if (isInUndiscoveredThirdRoom) {
    return true
  }

  const isDoorTile =
    (position.x === dungeonDoorPosition.x || position.x === roomWidth) &&
    position.y === dungeonDoorPosition.y

  if (isDoorTile) {
    return !isDoorOpen
  }

  const isSecretRoomDoor = isSecretRoomEntrance(position)

  if (isSecretRoomDoor) {
    return false
  }

  if (isRightRoomTeleporterPosition(position)) {
    return false
  }
  if (isThirdRoomTeleporterPosition(position)) {
    return false
  }

  if (position.y < 0) {
    if (isAnyThirdRoomArea(position)) {
      const isSupplyRoomReady = isSupplyRoomReadyForBoss(
        isThirdRoomLifeChestOpen,
        isThirdRoomBombChestOpen,
        isThirdRoomSwordChestOpen,
      )
      const isOpenSupplyChest = isThirdRoomSupplyChestOpen(
        position,
        isThirdRoomLifeChestOpen,
        isThirdRoomBombChestOpen,
        isThirdRoomSwordChestOpen,
      )

      if (isThirdRoomSupplyRoomArea(position) && isThirdRoomDoorOpen) {
        if (
          isThirdRoomBossTeleporterPosition(position) &&
          !isSupplyRoomReady
        ) {
          return true
        }

        if (isOpenSupplyChest) {
          return false
        }

        if (
          position.x === thirdRoomLifeChestPosition.x &&
          position.y === thirdRoomLifeChestPosition.y &&
          !isThirdRoomLifeChestOpen
        ) {
          return true
        }
        if (
          position.x === thirdRoomBombChestPosition.x &&
          position.y === thirdRoomBombChestPosition.y &&
          !isThirdRoomBombChestOpen
        ) {
          return true
        }
        if (
          position.x === thirdRoomSwordChestPosition.x &&
          position.y === thirdRoomSwordChestPosition.y &&
          !isThirdRoomSwordChestOpen
        ) {
          return true
        }

        return false
      }

      if (isThirdRoomSupplyRoomArea(position) && !isThirdRoomDoorOpen) {
        return true
      }

      if (!isThirdRoomChestOpen && isSamePosition(position, thirdRoomChestPosition)) {
        return true
      }

      if (isSamePosition(position, thirdRoomPushableWall)) {
        return !isThirdRoomBlockShifted
      }

      if (isThirdRoomDoorPosition(position)) {
        return !isThirdRoomDoorOpen
      }

      return getThirdRoomCell(position) === '#'
    }

    if (!secretRoomKnown) {
      return true
    }
    return (
      getSecretRoomCellForState(position, secretWallShifted, secretPocketOpen) ===
      '#'
    )
  }

  if (isSamePosition(position, rightRoomPushableWall)) {
    return !isRightRoomBlockShifted
  }

  if (!isRightRoomChestOpen && isSamePosition(position, rightRoomChestPosition)) {
    return true
  }

  return getDungeonCell(position) === '#'
}

export function isSecretWallPushable(
  player: Position,
  target: Position,
  secretWallShifted: boolean,
) {
  if (secretWallShifted) return false
  if (!isSecretRoomKnownWall(target)) return false
  if (player.x !== target.x || player.y !== target.y + 1) return false

  const destination = {
    x: pushableWallDestination.x,
    y: pushableWallDestination.y,
  }
  const destinationCell = getSecretRoomCellForState(destination, secretWallShifted, false)

  return destinationCell !== '#'
}

export function isRightRoomWallPushable(
  player: Position,
  target: Position,
  isRightRoomBlockShifted: boolean,
) {
  if (isRightRoomBlockShifted) return false
  if (!isSamePosition(target, rightRoomPushableWall)) return false
  if (player.x !== target.x || player.y !== target.y + 1) return false

  return getDungeonCell(rightRoomPushableWallDestination) !== '#'
}

export function isThirdRoomWallPushable(
  player: Position,
  target: Position,
  isThirdRoomBlockShifted: boolean,
) {
  if (isThirdRoomBlockShifted) return false
  if (!isSamePosition(target, thirdRoomPushableWall)) return false
  if (player.x !== target.x || player.y !== target.y + 1) return false

  return true
}

export function isSecretWallCornerPassable(
  player: Position,
  target: Position,
  secretWallShifted: boolean,
  secretPocketOpen: boolean,
) {
  if (!secretWallShifted || secretPocketOpen) return false
  if (target.x !== 2 || target.y !== -3) return false
  return Math.abs(player.x - target.x) <= 1 && Math.abs(player.y - target.y) <= 1
}

function isSecretRoomKnownWall(position: Position) {
  return position.x === pushableWallOriginal.x && position.y === pushableWallOriginal.y
}

export function isSamePosition(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y
}

type RatPositionLookup = {
  live: Map<string, SecretRat>
  dead: Map<string, SecretRat>
}

function buildRatPositionLookup(rats: SecretRat[]): RatPositionLookup {
  const live = new Map<string, SecretRat>()
  const dead = new Map<string, SecretRat>()

  for (const rat of rats) {
    const key = `${rat.x},${rat.y}`
    if (rat.health > 0) {
      live.set(key, rat)
      continue
    }

    if (!dead.has(key)) {
      dead.set(key, rat)
    }
  }

  return { live, dead }
}

function getDeadRatSprite(rat: SecretRat | undefined) {
  if (!rat) return null
  return rat.defeatedByDinosaur ? '💥' : '💀'
}

export function drawMap(
  player: Position,
  mouseHealth: number,
  mainMousePosition: Position,
  secretRoomKnown: boolean,
  secretWallShifted: boolean,
  secretPocketOpen: boolean,
  secretPocketRatState: SecretRat[] = [],
  mainMouseSkullVisible = false,
  mainMouseKeyVisible = false,
  isDoorOpen = false,
  isRightRoomKnown = false,
  isThirdRoomKnown = false,
  isRightRoomBlockShifted = false,
  isRightRoomKeyVisible = false,
  isRightRoomChestOpen = false,
  isVendingMachineAvailable = true,
  isSecretRoomDoorOpen = false,
  isSecretRoomTeleporterVisible = false,
  isThirdRoomChestKeyVisible = false,
  isThirdRoomChestOpen = false,
  isThirdRoomLifeChestOpen = false,
  isThirdRoomBombChestOpen = false,
  isThirdRoomSwordChestOpen = false,
  isThirdRoomBlockShifted = false,
  isThirdRoomDoorOpen = false,
  hideRowsAbove: number | boolean = false,
  mapViewportX = 0,
  mapViewportWidth?: number,
  isBossFight = false,
) {
  void isSecretRoomDoorOpen
  const ratPositionLookup = buildRatPositionLookup(secretPocketRatState)

  if (isBossFight) {
    return Array.from({ length: bossRoomHeight }, (_, rowIndex) =>
      Array.from({ length: bossRoomWidth }, (_, x) => {
        const position = { x, y: rowIndex }
        const positionKey = `${position.x},${position.y}`

        if (isSamePosition(position, player)) return '😎'

        const rat = ratPositionLookup.live.get(positionKey)
        if (rat) {
          return getRatSpriteForState(rat, true)
        }

        const deadRat = getDeadRatSprite(ratPositionLookup.dead.get(positionKey))
        if (deadRat) return deadRat

        if (
          position.x === 0 ||
          position.x === bossRoomWidth - 1 ||
          rowIndex === 0 ||
          rowIndex === bossRoomHeight - 1
        ) {
          return '#'
        }

        return '.'
      }).join(''),
    ).join('\n')
  }

  const getHiddenRowsCutoff = (value: number | boolean) => {
    if (value === true) return -6
    return value
  }

  const secretHeight = secretRoomKnown ? secretRoomHeight : 0
  const thirdHeight = isThirdRoomKnown ? thirdRoomHeight : 0
  const lowerHeight = Math.min(Math.max(secretHeight, thirdHeight), Math.abs(mapBottomY))
  const totalHeight = roomHeight + lowerHeight
  const visibleWidth =
    mapViewportWidth ??
    (roomWidth * (1 + (isRightRoomKnown ? 1 : 0)))
  const hiddenRowsAbove = getHiddenRowsCutoff(hideRowsAbove)

  return Array.from({ length: totalHeight }, (_, rowIndex) => {
    const worldY = rowIndex - lowerHeight
    const shouldHideRow =
      hiddenRowsAbove !== false && worldY > hiddenRowsAbove

    if (shouldHideRow) {
      return ''.padEnd(visibleWidth, '.')
    }

    return Array.from({ length: visibleWidth }, (_, x) => {
      const worldX = mapViewportX + x
      const position = { x: worldX, y: worldY }
      const positionKey = `${worldX},${worldY}`

      if (isSamePosition(position, player)) return '😎'

      if (isSamePosition(position, mainMousePosition)) {
        if (mouseHealth <= 0) {
          if (mainMouseKeyVisible) return '🔑'
          return mainMouseSkullVisible ? '💀' : '.'
        }
        return '🐁'
      }

      if (worldY < 0) {
        if (position.x < roomWidth && !secretRoomKnown) {
          return '#'
        }

        if (position.x >= roomWidth && !isThirdRoomKnown) {
          return '#'
        }

        if (isAnyThirdRoomArea(position)) {
          const isSupplyRoomReady = isSupplyRoomReadyForBoss(
            isThirdRoomLifeChestOpen,
            isThirdRoomBombChestOpen,
            isThirdRoomSwordChestOpen,
          )
          const isOpenSupplyChest = isThirdRoomSupplyChestOpen(
            position,
            isThirdRoomLifeChestOpen,
            isThirdRoomBombChestOpen,
            isThirdRoomSwordChestOpen,
          )

          if (isThirdRoomSupplyRoomArea(position) && isThirdRoomDoorOpen) {
            if (
              isThirdRoomBossTeleporterPosition(position) &&
              isSupplyRoomReady
            ) {
              return 'T'
            }
            if (isThirdRoomBossTeleporterPosition(position)) {
              return '.'
            }
            if (isOpenSupplyChest) {
              return '.'
            }
            if (
              position.x === thirdRoomLifeChestPosition.x &&
              position.y === thirdRoomLifeChestPosition.y &&
              !isThirdRoomLifeChestOpen
            ) {
              return '🪎'
            }
            if (
              position.x === thirdRoomBombChestPosition.x &&
              position.y === thirdRoomBombChestPosition.y &&
              !isThirdRoomBombChestOpen
            ) {
              return '🪎'
            }
            if (
              position.x === thirdRoomSwordChestPosition.x &&
              position.y === thirdRoomSwordChestPosition.y &&
              !isThirdRoomSwordChestOpen
            ) {
              return '🪎'
            }
            return '.'
          }

          if (
            isThirdRoomSupplyRoomArea(position) &&
            !isThirdRoomDoorOpen
          ) {
            return '#'
          }

          if (isThirdRoomDoorPosition(position)) {
            return isThirdRoomDoorOpen ? 'O' : '🚪'
          }

          if (
            isThirdRoomTeleporterPosition(position) &&
            isThirdRoomArea(position)
          ) {
            return 'T'
          }
          const boss = ratPositionLookup.live.get(positionKey)
          if (boss?.isBoss) return '🐉'

          if (isSamePosition(position, thirdRoomPushableWall)) {
            return isThirdRoomBlockShifted ? '.' : '#'
          }

          if (
            isThirdRoomChestKeyVisible &&
            isSamePosition(position, thirdRoomChestKeyPosition)
          ) {
            return '⚿'
          }

          if (
            !isThirdRoomChestOpen &&
            position.x === thirdRoomChestPosition.x &&
            worldY === thirdRoomChestPosition.y
          ) {
            return '🪎'
          }

          const rat = ratPositionLookup.live.get(positionKey)
          if (rat) return getRatSpriteForState(rat)
          const deadRat = getDeadRatSprite(ratPositionLookup.dead.get(positionKey))
          if (deadRat) return deadRat

          const cell = getThirdRoomCell(position)
          if (cell === '@') return '.'
          return cell
        }

        const cell = getSecretRoomCellForState(
          position,
          secretWallShifted,
          secretPocketOpen,
        )
        if (cell === '@') return '.'
        const rat = ratPositionLookup.live.get(positionKey)
        if (rat) return getRatSpriteForState(rat)
        const deadRat = getDeadRatSprite(ratPositionLookup.dead.get(positionKey))
        if (deadRat) return deadRat
        if (
          !isSecretRoomTeleporterVisible &&
          isSecretRoomTeleporterPosition(position)
        ) {
          return cell
        }
        if (
          isSecretRoomTeleporterVisible &&
          isSecretRoomTeleporterPosition(position)
        ) {
          return 'T'
        }
        if (
          isVendingMachineAvailable &&
          isVendingMachinePosition(position)
        ) {
          return 'V'
        }

        return cell
      }

      const cell = getDungeonCell(position) || '#'

      const isDoorCell =
        worldY === dungeonDoorPosition.y &&
        (position.x === dungeonDoorPosition.x || position.x === roomWidth)

      if (isDoorCell) {
        if (isDoorOpen) {
          return 'O'
        }
        return '🚪'
      }
      if (isSecretRoomEntrance(position)) {
        return '#'
      }
      if (isRightRoomTeleporterPosition(position)) {
        return '#'
      }
      const rat = ratPositionLookup.live.get(positionKey)
      if (rat) return getRatSpriteForState(rat)
      const deadRat = getDeadRatSprite(ratPositionLookup.dead.get(positionKey))
      if (deadRat) return deadRat
      if (cell === '@') return '.'
      if (cell === 'M') return '.'
      if (
        !isRightRoomChestOpen &&
        position.x === rightRoomChestPosition.x &&
        worldY === rightRoomChestPosition.y
      ) {
        return '🪎'
      }
      if (cell === 'D') {
        return isDoorOpen ? 'O' : 'D'
      }
      if (
        isRightRoomKeyVisible &&
        position.x === rightRoomChestKeyPosition.x &&
        worldY === rightRoomChestKeyPosition.y
      ) {
        return '⚿'
      }
      if (
        position.x === rightRoomPushableWall.x &&
        worldY === rightRoomPushableWall.y
      ) {
        return isRightRoomBlockShifted ? '.' : '#'
      }
      if (
        isVendingMachineAvailable &&
        isVendingMachinePosition(position)
      ) {
        return 'V'
      }

      return cell
    }).join('')
  }).join('\n')
}
