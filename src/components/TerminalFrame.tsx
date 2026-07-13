import type { ReactNode } from 'react'

type TerminalFrameProps = {
  children: ReactNode
}

export default function TerminalFrame({ children }: TerminalFrameProps) {
  return (
    <main className="terminal-frame" aria-label="Dungeon of Ben terminal">
      <div className="terminal-topbar">
        <span className="dot red" />
        <span className="dot amber" />
        <span className="dot green" />
        <span className="terminal-title">xterm - dungeon-of-ben</span>
      </div>
      {children}
    </main>
  )
}
