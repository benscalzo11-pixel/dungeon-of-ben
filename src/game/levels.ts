export type LevelChoice = 1 | 2 | 3 | 4
export type SectionChoice = 1 | 2

export type LevelMeta = {
  levelNumber: LevelChoice
  sectionNumber: SectionChoice
  sectionName: string
  roomName: string
  shortGoal: string
  objective: string
  gameplayLevel: LevelChoice
  isEmptyStarter?: boolean
}

export type SectionMeta = {
  id: SectionChoice
  name: string
  summary: string
}

export const sections: SectionMeta[] = [
  {
    id: 1,
    name: 'Vim Prison',
    summary: 'Escape the first cells and reach the Tmux Gate.',
  },
  {
    id: 2,
    name: 'Tmux Block',
    summary: 'Use panes, paths, and room control to go deeper.',
  },
]

export const levelsBySection: Record<SectionChoice, LevelMeta[]> = {
  1: [
    {
      levelNumber: 1,
      sectionNumber: 1,
      sectionName: 'Vim Prison',
      roomName: 'The Holding Cell',
      shortGoal: 'Escape the first cell.',
      objective: 'Defeat the mouse, collect the key, and open the first cell.',
      gameplayLevel: 1,
    },
    {
      levelNumber: 2,
      sectionNumber: 1,
      sectionName: 'Vim Prison',
      roomName: 'The Guard Corridor',
      shortGoal: 'Push through the corridor.',
      objective: 'Clear the guard corridor and collect enough room keys to advance.',
      gameplayLevel: 2,
    },
    {
      levelNumber: 3,
      sectionNumber: 1,
      sectionName: 'Vim Prison',
      roomName: 'The Mouse Nest',
      shortGoal: 'Survive the nest.',
      objective: 'Survive the mouse nest and reach the trophy room.',
      gameplayLevel: 3,
    },
    {
      levelNumber: 4,
      sectionNumber: 1,
      sectionName: 'Vim Prison',
      roomName: 'The Tmux Gate',
      shortGoal: 'Open the gate.',
      objective: 'Open the Tmux Gate and defeat the final guard.',
      gameplayLevel: 4,
    },
  ],
  2: [
    {
      levelNumber: 1,
      sectionNumber: 2,
      sectionName: 'Tmux Block',
      roomName: 'The Split Hall',
      shortGoal: 'Enter the empty Tmux hall.',
      objective: 'The first Tmux Block room is empty and ready to become a new lesson.',
      gameplayLevel: 1,
      isEmptyStarter: true,
    },
  ],
}

export const levels = Object.values(levelsBySection).flat()

export function getSectionMeta(section: SectionChoice) {
  return sections.find((entry) => entry.id === section) ?? sections[0]
}

export function getSectionLevels(section: SectionChoice) {
  return levelsBySection[section]
}

export function getLevelMeta(section: SectionChoice, level: LevelChoice) {
  return getSectionLevels(section).find((entry) => entry.levelNumber === level) ??
    getSectionLevels(section)[0]
}

export function getLevelMetaForGameplayLevel(level: LevelChoice) {
  return levels.find((entry) => entry.gameplayLevel === level) ?? levels[0]
}
