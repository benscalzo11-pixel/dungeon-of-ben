type HelpPanelProps = {
  showHelp: boolean
  objective: string
  playerHealth: number
  mouseHealth: number
  messages: string[]
}

export default function HelpPanel({
  showHelp,
  objective,
  playerHealth,
  mouseHealth,
  messages,
}: HelpPanelProps) {
  return (
    <aside className="side-panel">
      <section className="side-section">
        <h2>Objective</h2>
        <p>{objective}</p>
      </section>

      <section className="side-section">
        <h2>Health</h2>
        <p>Player: {playerHealth}</p>
        <p>Mouse: {mouseHealth}</p>
      </section>

      {showHelp ? (
        <section className="side-section">
          <h2>Help</h2>
          <ul>
            <li>h j k l - move left, down, up, right</li>
            <li>x - strike an adjacent enemy</li>
            <li>? - toggle this help panel</li>
            <li>: - open command input</li>
            <li>:w - fake save state</li>
            <li>:q - try to quit</li>
            <li>:e intro - reread the intro</li>
            <li>:telnet level2 - a bad idea</li>
          </ul>
        </section>
      ) : (
        <section className="side-section">
          <h2>Commands</h2>
          <p>Press ? to show help.</p>
          <p>Find your way out without touching the mouse.</p>
        </section>
      )}

      <section className="side-section message-log">
        <h2>Log</h2>
        <ol>
          {messages.map((message, index) => (
            <li key={`${index}-${message}`}>{message}</li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
