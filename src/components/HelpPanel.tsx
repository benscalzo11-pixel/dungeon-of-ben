import { futureProgressionMessages } from '../game/narrative'

type HelpPanelProps = {
  showHelp: boolean
}

export default function HelpPanel({ showHelp }: HelpPanelProps) {
  if (!showHelp) {
    return (
      <aside className="side-panel">
        <h2>Help</h2>
        <p>Press ? to show the full help panel.</p>
        <p>Find your way out without touching the mouse.</p>
      </aside>
    )
  }

  return (
    <aside className="side-panel">
      <h2>Help</h2>
      <section className="help-section">
        <h3>Movement (NORMAL mode)</h3>
        <ul>
          <li>h - move left</li>
          <li>j - move down</li>
          <li>k - move up</li>
          <li>l - move right</li>
        </ul>
      </section>
      <section className="help-section">
        <h3>Command mode</h3>
        <ul>
          <li>Press : to enter command mode.</li>
          <li>Type a command and press Enter to execute.</li>
          <li>Press Escape to cancel and return to NORMAL mode.</li>
          <li>:w and :q behave as in the old terminal trick.</li>
          <li>:e intro to reread this story.</li>
          <li>:telnet level2 is a bad idea. (It hurts.)</li>
          <li>:restart brings you back to the beginning.</li>
        </ul>
      </section>
      <section className="help-section">
        <h3>Objective</h3>
        <p>
          Move carefully, learn the commands, discover power words, and keep one instinct:
          every step is a choice.
        </p>
      </section>
      <section className="help-section">
        <h3>Vim philosophy</h3>
        <p>
          Vim rewards small, intentional actions. You don’t need to be fast; you need to be
          clear. Move the cursor, think in commands, and change one state at a time.
        </p>
      </section>
      <section className="help-section">
        <h3>Future progression messages</h3>
        <ul>
          {futureProgressionMessages.map((entry) => (
            <li key={entry.key}>{entry.message}</li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
