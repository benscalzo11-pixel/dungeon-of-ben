import type { Position } from './types'

export type SecretRat = Position & {
  health: number
  defeatedByDinosaur?: boolean
}

const leftDungeonRoom = [
  '#############',
  '#@....#.....#',
  '#.##..#..#..#',
  '#......M.#..#',
  '#..#......#.D',
  '#############',
]

const rightDungeonRoom = [
  '#############',
  '#.....#.....#',
  '#.##..#..#..#',
  '#....#...#..#',
  '#..#......#..',
  '#############',
]
export const rightRoomPushableWall = { x: 16, y: 2 }
export const rightRoomPushableWallDestination = { x: 16, y: 1 }
export const rightRoomChestPosition = { x: 17, y: 3 }
export const rightRoomChestKeyPosition = { x: 16, y: 1 }

export const dungeonMap = leftDungeonRoom
export const roomWidth = 13
export const dungeonDoorPosition = { x: roomWidth - 1, y: 3 }

const secretRoomLayout: string[] = [
  '#############',
  '#...........#',
  '#.###...###.#',
  '#...........#',
  '#...........#',
]
const secretPocketLayout: string[] = [
  '#############',
  '#.....#######',
  '#.....#######',
  '#.....#######',
  '#.....#######',
]
const secretRoomEntrance: Position = { x: 7, y: 0 }
const pushableWallOriginal: Position = { x: 3, y: -3 }
const pushableWallDestination: Position = { x: 3, y: -4 }
const secretRoomHeight = secretRoomLayout.length
const mapWidth = roomWidth * 2

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

  if (position.y === -1 && position.x === secretRoomEntrance.x) {
    return '.'
  }

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

function getDungeonCell(position: Position) {
  const inRightRoom = position.x >= roomWidth
  const localX = inRightRoom ? position.x - roomWidth : position.x
  const roomRows = inRightRoom ? rightDungeonRoom : leftDungeonRoom
  const row = roomRows[position.y]
  return row?.[localX]
}

export function isWall(
  position: Position,
  secretRoomKnown = false,
  secretWallShifted = false,
  secretPocketOpen = false,
  secretPocketRatState: SecretRat[] = [],
  isDoorOpen = false,
  isRightRoomKnown = false,
  isRightRoomBlockShifted = false,
  isRightRoomChestOpen = false,
) {
  if (secretPocketRatState.some((rat) => rat.health > 0 && rat.x === position.x && rat.y === position.y)) {
    return true
  }

  if (position.x < 0 || position.x >= mapWidth) {
    return true
  }

  if (position.y >= dungeonMap.length || position.y < -secretRoomHeight) {
    return true
  }

  const isInUndiscoveredRightRoom =
    !isRightRoomKnown &&
    position.y >= 0 &&
    position.y < dungeonMap.length &&
    position.x >= roomWidth

  if (isInUndiscoveredRightRoom) {
    if (position.x === roomWidth && position.y === dungeonDoorPosition.y && isDoorOpen) {
      return false
    }

    return true
  }

  if (!isDoorOpen && position.x === dungeonDoorPosition.x && position.y === dungeonDoorPosition.y) {
    return true
  }

  if (!isDoorOpen && position.x === roomWidth && position.y === dungeonDoorPosition.y) {
    return true
  }

  if (position.x === secretRoomEntrance.x && position.y === secretRoomEntrance.y) {
    return false
  }

  if (position.y < 0) {
    if (!secretRoomKnown) return true
    return (
      getSecretRoomCellForState(position, secretWallShifted, secretPocketOpen) ===
      '#'
    )
  }

  if (!isRightRoomBlockShifted && isSamePosition(position, rightRoomPushableWall)) {
    return true
  }

  if (!isRightRoomChestOpen && isSamePosition(position, rightRoomChestPosition)) {
    return true
  }

  return getDungeonCell(position) === '#'
}

export function isSecretRoomEntrance(position: Position) {
  return position.x === secretRoomEntrance.x && position.y === secretRoomEntrance.y
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

export function drawMap(
  player: Position,
  mouseHealth: number,
  secretRoomKnown: boolean,
  secretWallShifted: boolean,
  secretPocketOpen: boolean,
  secretPocketRatState: SecretRat[] = [],
  mainMouseSkullVisible = false,
  mainMouseKeyVisible = false,
  isDoorOpen = false,
  isRightRoomKnown = false,
  isRightRoomBlockShifted = false,
  isRightRoomKeyVisible = false,
  isRightRoomChestOpen = false,
) {
  const secretHeight = secretRoomKnown ? secretRoomHeight : 0
  const totalHeight = dungeonMap.length + secretHeight
  const visibleWidth = isRightRoomKnown ? mapWidth : roomWidth

  return Array.from({ length: totalHeight }, (_, rowIndex) => {
    const worldY = rowIndex - secretHeight

    return Array.from({ length: visibleWidth }, (_, x) => {
      if (player.x === x && player.y === worldY) return '😎'

      if (worldY < 0) {
        const cell = getSecretRoomCellForState(
          { x, y: worldY },
          secretWallShifted,
          secretPocketOpen,
        )
        if (cell === '@') return '.'
        const hasRat = secretPocketRatState.some(
          (rat) =>
            rat.health > 0 &&
            rat.x === x &&
            rat.y === worldY,
        )
        if (hasRat) return '🐁'
        const hasDeadRat = secretPocketRatState.some(
          (rat) =>
            rat.health <= 0 &&
            !rat.defeatedByDinosaur &&
            rat.x === x &&
            rat.y === worldY,
        )
        if (hasDeadRat) return '💀'
        const hasDinosaurDeadRat = secretPocketRatState.some(
          (rat) =>
            rat.health <= 0 &&
            rat.defeatedByDinosaur &&
            rat.x === x &&
            rat.y === worldY,
        )
        if (hasDinosaurDeadRat) return '💥'
        return cell
      }

      const cell = getDungeonCell({ x, y: worldY }) || '#'
      if (!isDoorOpen && x === roomWidth && worldY === dungeonDoorPosition.y) {
        return '#'
      }
      if (
        !isDoorOpen &&
        worldY === dungeonDoorPosition.y &&
        x === dungeonDoorPosition.x
      ) {
        return '🚪'
      }
      const hasRat = secretPocketRatState.some(
        (rat) => rat.health > 0 && rat.x === x && rat.y === worldY,
      )
      if (hasRat) return '🐁'
      const hasDeadRat = secretPocketRatState.some(
        (rat) => rat.health <= 0 && rat.x === x && rat.y === worldY,
      )
      if (hasDeadRat) {
        const hasDinosaurDeadRat = secretPocketRatState.some(
          (rat) =>
            rat.health <= 0 &&
            rat.defeatedByDinosaur &&
            rat.x === x &&
            rat.y === worldY,
        )
        if (hasDinosaurDeadRat) return '💥'
        return '💀'
      }
      if (cell === '@') return '.'
        if (cell === 'M') {
          if (mouseHealth <= 0) {
            if (mainMouseKeyVisible) return '🔑'
            return mainMouseSkullVisible ? '💀' : '.'
          }
          return '🐁'
        }
        if (
          !isRightRoomChestOpen &&
          x === rightRoomChestPosition.x &&
          worldY === rightRoomChestPosition.y
        ) {
          return '🪎'
        }
        if (cell === 'D') {
          if (isDoorOpen) return '.'
          return mouseHealth <= 0 ? 'O' : 'D'
        }
        if (
          isRightRoomKeyVisible &&
          x === rightRoomChestKeyPosition.x &&
          worldY === rightRoomChestKeyPosition.y
        ) {
          return '⚿'
        }
        if (
          x === rightRoomPushableWall.x &&
          worldY === rightRoomPushableWall.y
        ) {
          return isRightRoomBlockShifted ? '.' : '#'
        }

        return cell
      }).join('')
    }).join('\n')
}
