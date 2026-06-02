type HelpPanelProps = {
  showHelp: boolean
}

export default function HelpPanel({ showHelp }: HelpPanelProps) {
  if (!showHelp) {
    return (
      <aside className="side-panel">
        <h2>Commands</h2>
        <p>Press ? to show help.</p>
        <p>Find your way out without touching the mouse.</p>
      </aside>
    )
  }

  return (
    <aside className="side-panel">
      <h2>Help</h2>
      <ul>
        <li>h j k l - move left, down, up, right</li>
        <li>? - toggle this help panel</li>
        <li>: - open command input</li>
        <li>:w - fake save state</li>
        <li>:q - try to quit</li>
        <li>:e intro - reread the intro</li>
        <li>:telnet level2 - a bad idea</li>
      </ul>
    </aside>
  )
}
