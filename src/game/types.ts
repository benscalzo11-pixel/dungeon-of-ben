export type GameMode = 'title' | 'normal' | 'command'

export type Position = {
  x: number
  y: number
}

export type CommandContext = {
  doorUnlocked: boolean
}

export type CommandResult = {
  message: string
  showIntro?: boolean
  isTrap?: boolean
  shouldRestart?: boolean
  escaped?: boolean
}
