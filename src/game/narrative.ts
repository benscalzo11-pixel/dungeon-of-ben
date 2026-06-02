export const titleScreenContent = {
  heading: 'Dungeon of Vim: The Escape Protocol',
  subtitle: 'A stone prison remembers your habits. Learn to move with intention and it will let you go.',
  introPrompt: 'Press any key to awaken the terminal.',
}

export const introStoryText = [
  'Prison Block 0',
  '',
  'You awaken in a stone cell.',
  '',
  'The guards are gone.',
  '',
  'A giant mouse blocks the only exit.',
  '',
  'Rumors speak of ancient powers:',
  'Vim.',
  'tmux.',
  'bash.',
  'sudo.',
].map((line) => line)

export const introContinuePrompt = 'Press any key to continue.'

export const gameIntroMessage =
  'You awaken in Prison Block 0. The stone walls hum with old command echoes. A giant mouse still guards the exit; the runes ask for Vim.'

export const objectiveText = {
  current: 'Defeat the mouse.',
  future: ['Unlock the cell.', 'Learn Vim.', 'Escape the prison.'],
}

export const futureProgressionMessages = [
  {
    key: 'mouse-defeated',
    message: 'Mouse defeated.',
  },
  {
    key: 'door-unlocked',
    message: 'Door unlocked.',
  },
  {
    key: 'first-escape',
    message: 'First escape.',
  },
  {
    key: 'discover-tmux',
    message: 'Discovering tmux.',
  },
  {
    key: 'discover-bash',
    message: 'Discovering bash.',
  },
  {
    key: 'discover-ssh',
    message: 'Discovering ssh.',
  },
]

