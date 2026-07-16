import { useEffect, useRef, useState } from 'react'
import GameScreen from './components/GameScreen'
import TerminalFrame from './components/TerminalFrame'
import {
  titleScreenContent,
  introContinuePrompt,
  introStoryText,
} from './game/narrative'
import { levels, type LevelChoice } from './game/levels'

type IntroScreenState = 'title' | 'story' | 'mode-select' | 'level-select' | 'game'
type GameDifficulty = 'normal' | 'hard'

export default function App() {
  const [introState, setIntroState] = useState<IntroScreenState>('title')
  const [selectedLevel, setSelectedLevel] = useState<LevelChoice>(1)
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal')
  const [gameSessionId, setGameSessionId] = useState(0)
  const levelSelectTransitionRef = useRef(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      setIntroState((currentState) => {
        if (currentState === 'title') return 'story'
        if (currentState === 'story') return 'mode-select'
        if (currentState === 'mode-select') {
          const modeKey = event.key
          if (modeKey !== '1' && modeKey !== '2') return 'mode-select'
          if (event.repeat) return 'mode-select'

          setSelectedDifficulty(modeKey === '2' ? 'hard' : 'normal')
          if (modeKey === '2') {
            setSelectedLevel(1)
            return 'game'
          }
          return 'level-select'
        }
        if (currentState === 'level-select') {
          if (
            event.key !== '1' &&
            event.key !== '2' &&
            event.key !== '3' &&
            event.key !== '4'
          ) return 'level-select'
          if (levelSelectTransitionRef.current) return 'level-select'
          if (event.repeat) return 'level-select'

          levelSelectTransitionRef.current = true
          if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4') {
            const nextLevel = Number(event.key) as LevelChoice
            setSelectedLevel(nextLevel)
            return 'game'
          }
          return 'level-select'
        }
        return currentState
      })
    }

    if (introState !== 'game') {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [introState])

  useEffect(() => {
    if (introState !== 'level-select') {
      levelSelectTransitionRef.current = false
    }
  }, [introState])

  return (
    <TerminalFrame>
      {introState === 'game' ? (
        <GameScreen
          key={`${selectedDifficulty}-${selectedLevel}-${gameSessionId}`}
          level={selectedLevel}
          difficulty={selectedDifficulty}
          onModeChange={(nextDifficulty) => {
            setSelectedDifficulty(nextDifficulty)
            setSelectedLevel(1)
            setGameSessionId((currentSessionId) => currentSessionId + 1)
          }}
        />
      ) : (
        <section className="title-screen">
          <p className="boot-line">/usr/games/dungeon-of-ben</p>
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
            {introState === 'title'
              ? titleScreenContent.introPrompt
              : introState === 'story'
                ? introContinuePrompt
                : introState === 'mode-select'
                  ? 'Press 1 for normal mode or 2 for hard mode.'
                  : 'Press 1, 2, 3, or 4 to select a room.'}
          </p>
          {introState === 'mode-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose mode</p>
              <p>[1] Normal Mode</p>
              <p>[2] Hard Mode</p>
            </div>
          ) : null}
          {introState === 'level-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Which room?</p>
              <p>Section 1: Vim Prison</p>
              {levels.map((level) => (
                <p key={level.id}>[{level.id}] Room {level.id}: {level.roomName}</p>
              ))}
              <p>Current choice: {selectedLevel}</p>
            </div>
          ) : null}
        </section>
      )}
    </TerminalFrame>
  )
}
