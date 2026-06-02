import type { Position } from './types'

export const dungeonMap = [
  '#############',
  '#@....#.....#',
  '#.##..#..#..#',
  '#......M.#..#',
  '#..#......D.#',
  '#############',
]

export const startPosition: Position = { x: 1, y: 1 }
export const mousePosition: Position = { x: 7, y: 3 }

export function isWall(position: Position) {
  return dungeonMap[position.y]?.[position.x] === '#'
}

export function isSamePosition(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y
}

export function drawMap(player: Position, mouseHealth: number, doorUnlocked: boolean) {
  return dungeonMap
    .map((row, y) =>
      [...row]
        .map((cell, x) => {
          if (player.x === x && player.y === y) return '@'
          if (cell === '@') return '.'
          if (cell === 'M' && mouseHealth <= 0) return 'm'
          if (cell === 'D' && doorUnlocked) return 'O'
          return cell
        })
        .join(''),
    )
    .join('\n')
}
