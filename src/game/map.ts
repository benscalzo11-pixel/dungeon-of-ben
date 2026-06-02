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

export function isWall(position: Position) {
  return dungeonMap[position.y]?.[position.x] === '#'
}

export function drawMap(player: Position) {
  return dungeonMap
    .map((row, y) =>
      [...row]
        .map((cell, x) => {
          if (player.x === x && player.y === y) return '@'
          if (cell === '@') return '.'
          return cell
        })
        .join(''),
    )
    .join('\n')
}
