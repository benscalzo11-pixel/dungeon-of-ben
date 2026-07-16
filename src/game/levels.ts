export type LevelChoice = 1 | 2 | 3 | 4

export type LevelMeta = {
  id: LevelChoice
  sectionNumber: 1
  sectionName: string
  roomName: string
  shortGoal: string
  objective: string
}

export const vimPrisonSectionName = 'Vim Prison'

export const levels: LevelMeta[] = [
  {
    id: 1,
    sectionNumber: 1,
    sectionName: vimPrisonSectionName,
    roomName: 'The Holding Cell',
    shortGoal: 'Escape the first cell.',
    objective: 'Defeat the mouse, collect the key, and open the first cell.',
  },
  {
    id: 2,
    sectionNumber: 1,
    sectionName: vimPrisonSectionName,
    roomName: 'The Guard Corridor',
    shortGoal: 'Push through the corridor.',
    objective: 'Clear the guard corridor and collect enough room keys to advance.',
  },
  {
    id: 3,
    sectionNumber: 1,
    sectionName: vimPrisonSectionName,
    roomName: 'The Mouse Nest',
    shortGoal: 'Survive the nest.',
    objective: 'Survive the mouse nest and reach the trophy room.',
  },
  {
    id: 4,
    sectionNumber: 1,
    sectionName: vimPrisonSectionName,
    roomName: 'The Tmux Gate',
    shortGoal: 'Open the gate.',
    objective: 'Open the Tmux Gate and defeat the final guard.',
  },
]

export function getLevelMeta(level: LevelChoice) {
  return levels.find((entry) => entry.id === level) ?? levels[0]
}
