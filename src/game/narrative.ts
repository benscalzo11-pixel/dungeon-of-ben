export const titleScreenContent = {
  heading: 'Dungeon of Ben: The Escape Protocol',
  subtitle: 'A corrupted terminal remembers every misstep. Learn to move with intention and make the shell obey.',
  introPrompt: 'Press any key to awaken the terminal.',
}

export const introStoryText = [
  'Corrupted Terminal Block 0',
  '',
  'You awaken inside a flickering terminal shell.',
  '',
  'The guards are gone; the static remains.',
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
  'You awaken in Corrupted Terminal Block 0. The buffer walls hum with old command echoes. A giant mouse still guards the exit; the glyphs ask for Vim.'

export const objectiveText = {
  current: 'Defeat the mouse.',
  future: ['Unlock the cell.', 'Learn Vim.', 'Escape the corrupted terminal.'],
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
