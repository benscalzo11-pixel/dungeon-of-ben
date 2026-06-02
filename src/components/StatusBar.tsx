import type { GameMode } from '../game/types'

type StatusBarProps = {
  mode: GameMode
  message: string
  commandInput: string
  isCommandOpen: boolean
}

export default function StatusBar({ mode, message, commandInput, isCommandOpen }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span className="status-mode">{mode === 'command' ? 'COMMAND' : 'NORMAL'}</span>
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
