import { memo } from 'react'
import { futureProgressionMessages } from '../game/narrative'

type HelpPanelProps = {
  level: 1 | 2 | 3 | 4
  showHelp: boolean
  playerHealth: number
  mouseHealth: number
  messages: string[]
}

export default memo(function HelpPanel({
  level,
  showHelp,
  playerHealth,
  mouseHealth,
  messages,
}: HelpPanelProps) {
  const playerLives = '❤️'.repeat(playerHealth)

  return (
    <aside className="side-panel">
      {showHelp ? (
        <>
          <section className="side-section">
            <h2>Help</h2>
            <h3>Movement (NORMAL mode)</h3>
            <ul>
              <li>Level: {level}</li>
              <li>h - move left</li>
              <li>j - move down</li>
              <li>k - move up</li>
              <li>l - move right</li>
              <li>e - strike an adjacent enemy</li>
              <li>:enemy - open enemy guide</li>
              <li>:mode - choose normal or hard mode</li>
              <li>w - bomb ability (Level 1)</li>
              <li>d - cleave adjacent enemies (Level 2)</li>
              <li>a - focused shot against a lined-up enemy (Level 3)</li>
              <li>s - fire a rail shot up to 2 enemies in one line (Level 4)</li>
              <li>y - pick up a key</li>
              <li>u - use a chest key or vending machine</li>
              <li>f - dinosaur attack after 3 rat kills (Level 1)</li>
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
          <section className="help-section">
            <h3>Vim philosophy</h3>
            <ul>
              <li>Vim rewards small, intentional actions.</li>
              <li>Move the cursor, think in commands, and change one state at a time.</li>
            </ul>
          </section>
          <section className="help-section">
            <h3>Future progression messages</h3>
            <ul>
              {futureProgressionMessages.map((entry) => (
                <li key={entry.key}>{entry.message}</li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="side-section">
          <h2>Commands</h2>
          <p>Press ? to show help.</p>
          <p>Find your way out without touching the mouse.</p>
        </section>
      )}

      <section className="side-section">
        <h2>Health</h2>
        <p>Player Lives: {playerHealth} {playerLives}</p>
        <p>Mouse: {mouseHealth}</p>
      </section>

      <section className="side-section message-log">
        <h2>Log</h2>
        <ol>
          {messages.map((entry, index) => (
            <li key={`${index}-${entry}`}>{entry}</li>
          ))}
        </ol>
      </section>
    </aside>
  )
})
