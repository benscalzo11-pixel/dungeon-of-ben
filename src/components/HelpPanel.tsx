import { memo } from 'react'
import type { LevelMeta } from '../game/levels'

const abilityHelpEntries = [
  {
    unlockLevel: 1,
    text: 'w - bomb ability',
  },
  {
    unlockLevel: 2,
    text: 'd - cleave adjacent enemies',
  },
  {
    unlockLevel: 3,
    text: 'a - focused shot against a lined-up enemy',
  },
  {
    unlockLevel: 4,
    text: 's - fire a rail shot up to 2 enemies in one line',
  },
]

type HelpPanelProps = {
  levelMeta: LevelMeta
  showHelp: boolean
}

export default memo(function HelpPanel({
  levelMeta,
  showHelp,
}: HelpPanelProps) {
  const availableAbilityEntries = abilityHelpEntries.filter(
    (entry) => levelMeta.gameplayLevel >= entry.unlockLevel,
  )

  return (
    <aside className="side-panel">
      {showHelp ? (
        <>
          <section className="side-section">
            <h2>Help</h2>
            <h3>Movement (NORMAL mode)</h3>
            <ul>
              <li>Section {levelMeta.sectionNumber}: {levelMeta.sectionName}</li>
              <li>Level {levelMeta.levelNumber}: {levelMeta.roomName}</li>
              <li>h - move left</li>
              <li>j - move down</li>
              <li>k - move up</li>
              <li>l - move right</li>
              <li>e - strike an adjacent enemy</li>
              <li>:enemy - open enemy guide</li>
              <li>:mode - choose normal or hard mode</li>
              {availableAbilityEntries.map((entry) => (
                <li key={entry.text}>{entry.text}</li>
              ))}
              <li>y - yank a key</li>
              <li>u - use a chest key or vending machine</li>
            </ul>
          </section>
          <section className="side-section">
            <h3>Command mode</h3>
            <ul>
              <li>Press : to enter command mode.</li>
              <li>Type a command and press Enter to execute.</li>
              <li>Press Escape to return to NORMAL mode.</li>
              <li>:w - fake save state</li>
              <li>:q - try to exit if the door is open.</li>
              <li>:e intro - reread this story.</li>
              <li>:telnet level2 - a bad idea (it hurts).</li>
              <li>:restart - restart the game.</li>
            </ul>
          </section>
        </>
      ) : (
        <section className="side-section">
          <h2>Commands</h2>
          <p>Press ? to show help.</p>
          <p>Level {levelMeta.levelNumber}: {levelMeta.roomName}</p>
          <p>{levelMeta.shortGoal}</p>
        </section>
      )}

    </aside>
  )
})
