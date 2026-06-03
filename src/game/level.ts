import type { Position } from './types'

export const playerMaxHealth = 1
export const mouseMaxHealth = 3

export function isAdjacent(first: Position, second: Position) {
  const distanceX = Math.abs(first.x - second.x)
  const distanceY = Math.abs(first.y - second.y)

  return distanceX + distanceY === 1
}

export function attackMouse(mouseHealth: number) {
  const nextHealth = Math.max(0, mouseHealth - 1)

  if (nextHealth === 0) {
    return {
      mouseHealth: nextHealth,
      message: 'The mouse falls. The cell door unlocks.',
    }
  }

  return {
    mouseHealth: nextHealth,
    message: `You strike the mouse. Mouse health: ${nextHealth}/${mouseMaxHealth}.`,
  }
}

export function getObjective(mouseHealth: number) {
  if (mouseHealth > 0) {
    return 'Defeat the mouse to unlock the door.'
  }

  return 'The mouse is defeated. Use :q to leave the first cell.'
}
