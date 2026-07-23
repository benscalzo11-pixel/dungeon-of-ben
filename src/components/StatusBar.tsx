import { memo } from 'react'
import { playerMaxHealth } from '../game/level'
import type { GameMode } from '../game/types'
import type { LevelMeta } from '../game/levels'

type StatusBarProps = {
  mode: GameMode
  message: string
  commandInput: string
  isCommandOpen: boolean
  playerHealth: number
  levelMeta: LevelMeta
}

export default memo(function StatusBar({
  mode,
  message,
  commandInput,
  isCommandOpen,
  playerHealth,
  levelMeta,
}: StatusBarProps) {
  const displayedPlayerHealth = Math.min(playerHealth, playerMaxHealth)
  const playerLives = '❤️'.repeat(displayedPlayerHealth)

  return (
    <footer className="status-bar">
      <span className="status-mode">{mode === 'command' ? 'COMMAND' : 'NORMAL'}</span>
      <span className="status-lives">
        Player Lives: {displayedPlayerHealth} {playerLives}
      </span>
      <span className="status-room">
        S{levelMeta.sectionNumber} L{levelMeta.levelNumber}: {levelMeta.roomName}
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
})
