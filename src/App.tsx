import { useEffect, useState } from 'react'
import GameScreen from './components/GameScreen'
import TerminalFrame from './components/TerminalFrame'

export default function App() {
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return
      setHasStarted(true)
    }

    if (!hasStarted) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasStarted])

  return (
    <TerminalFrame>
      {hasStarted ? (
        <GameScreen />
      ) : (
        <section className="title-screen">
          <p className="boot-line">/usr/games/dungeon-of-vim</p>
          <h1>Dungeon of Vim</h1>
          <p className="subtitle">A prison you can escape only by learning Vim.</p>
          <p className="prompt">Press ENTER to begin your sentence.</p>
        </section>
      )}
    </TerminalFrame>
  )
}
