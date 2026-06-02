export type GameMode = 'title' | 'normal' | 'command'

export type Position = {
  x: number
  y: number
}

export type CommandResult = {
  message: string
  showIntro?: boolean
  isTrap?: boolean
}
