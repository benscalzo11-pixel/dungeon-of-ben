import { useEffect, useState } from 'react'
import GameScreen from './components/GameScreen'
import TerminalFrame from './components/TerminalFrame'
import {
  titleScreenContent,
  introContinuePrompt,
  introStoryText,
} from './game/narrative'

type IntroScreenState = 'title' | 'story' | 'game'

export default function App() {
  const [introState, setIntroState] = useState<IntroScreenState>('title')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      if (introState === 'title') {
        setIntroState('story')
      } else if (introState === 'story') {
        setIntroState('game')
      }
    }

    if (introState !== 'game') {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [introState])

  return (
    <TerminalFrame>
      {introState === 'game' ? (
        <GameScreen />
      ) : (
        <section className="title-screen">
          <p className="boot-line">/usr/games/dungeon-of-vim</p>
          <h1>{titleScreenContent.heading}</h1>
          <p className="subtitle">{titleScreenContent.subtitle}</p>
          {introState === 'story' ? (
            <div className="story-screen" aria-label="Prison introduction">
              {introStoryText.map((line, index) => (
                <p key={line + index} className={line === '' ? 'story-gap' : 'story-line'}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          <p className="prompt">
            {introState === 'title' ? titleScreenContent.introPrompt : introContinuePrompt}
          </p>
        </section>
      )}
    </TerminalFrame>
  )
}
