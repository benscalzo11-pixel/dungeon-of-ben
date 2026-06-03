import type { GameMode } from '../game/types'

type StatusBarProps = {
  mode: GameMode
  message: string
  commandInput: string
  isCommandOpen: boolean
  playerHealth: number
}

export default function StatusBar({
  mode,
  message,
  commandInput,
  isCommandOpen,
  playerHealth,
}: StatusBarProps) {
  const playerLives = '❤️'.repeat(playerHealth)

  return (
    <footer className="status-bar">
      <span className="status-mode">{mode === 'command' ? 'COMMAND' : 'NORMAL'}</span>
      <span className="status-lives">
        Player Lives: {playerHealth} {playerLives}
      </span>
      <span className="status-message">
        {isCommandOpen ? (
          <>
            :<span className="command-input">{commandInput}</span>
            <span className="cursor" />
          </>
        ) : (
          message
        )}
      </span>
    </footer>
  )
}
