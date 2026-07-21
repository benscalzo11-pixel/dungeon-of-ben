import { useEffect, useRef, useState } from 'react'
import GameScreen from './components/GameScreen'
import TerminalFrame from './components/TerminalFrame'
import TmuxSplitHallScreen from './components/TmuxSplitHallScreen'
import {
  titleScreenContent,
  introContinuePrompt,
  introStoryText,
} from './game/narrative'
import {
  getLevelMeta,
  getSectionLevels,
  sections,
  type LevelChoice,
  type SectionChoice,
} from './game/levels'

type IntroScreenState = 'title' | 'story' | 'mode-select' | 'section-select' | 'level-select' | 'game'
type GameDifficulty = 'normal' | 'hard'

export default function App() {
  const [introState, setIntroState] = useState<IntroScreenState>('title')
  const [selectedSection, setSelectedSection] = useState<SectionChoice>(1)
  const [selectedLevel, setSelectedLevel] = useState<LevelChoice>(1)
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal')
  const [gameSessionId, setGameSessionId] = useState(0)
  const levelSelectTransitionRef = useRef(false)
  const selectedLevelOptions = getSectionLevels(selectedSection)
  const selectedLevelMeta = getLevelMeta(selectedSection, selectedLevel)

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
          setSelectedSection(1)
          setSelectedLevel(1)
          return 'section-select'
        }
        if (currentState === 'section-select') {
          if (event.key !== '1' && event.key !== '2') return 'section-select'
          if (event.repeat) return 'section-select'

          const nextSection = Number(event.key) as SectionChoice
          const firstLevel = getSectionLevels(nextSection)[0]?.levelNumber ?? 1
          setSelectedSection(nextSection)
          setSelectedLevel(firstLevel)
          return 'level-select'
        }
        if (currentState === 'level-select') {
          const nextLevel = Number(event.key) as LevelChoice
          const isAvailableLevel = selectedLevelOptions.some(
            (level) => level.levelNumber === nextLevel,
          )
          if (!isAvailableLevel) {
            return 'level-select'
          }
          if (levelSelectTransitionRef.current) return 'level-select'
          if (event.repeat) return 'level-select'

          levelSelectTransitionRef.current = true
          setSelectedLevel(nextLevel)
          return 'game'
        }
        return currentState
      })
    }

    if (introState !== 'game') {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [introState, selectedLevelOptions])

  useEffect(() => {
    if (introState !== 'level-select') {
      levelSelectTransitionRef.current = false
    }
  }, [introState])

  return (
    <TerminalFrame>
      {introState === 'game' ? (
        selectedLevelMeta.usesTmuxSplitHall ? (
          <TmuxSplitHallScreen
            key={`${selectedDifficulty}-${selectedSection}-${selectedLevel}-${gameSessionId}`}
            levelMeta={selectedLevelMeta}
            difficulty={selectedDifficulty}
          />
        ) : (
          <GameScreen
            key={`${selectedDifficulty}-${selectedSection}-${selectedLevel}-${gameSessionId}`}
            level={selectedLevelMeta.gameplayLevel}
            levelMeta={selectedLevelMeta}
            difficulty={selectedDifficulty}
            onModeChange={(nextDifficulty) => {
              setSelectedDifficulty(nextDifficulty)
              setSelectedSection(1)
              setSelectedLevel(1)
              setGameSessionId((currentSessionId) => currentSessionId + 1)
            }}
          />
        )
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
          {introState !== 'mode-select' && introState !== 'section-select' ? (
            <p className="prompt">
              {introState === 'title'
                ? titleScreenContent.introPrompt
                : introState === 'story'
                  ? introContinuePrompt
                  : 'Press a number to select a level.'}
            </p>
          ) : null}
          {introState === 'mode-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose mode</p>
              <p>[1] Normal Mode</p>
              <p>[2] Hard Mode</p>
            </div>
          ) : null}
          {introState === 'level-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose level</p>
              <p>Section {selectedSection}: {selectedLevelMeta.sectionName}</p>
              {selectedLevelOptions.map((level) => (
                <p key={level.levelNumber}>
                  [{level.levelNumber}] Level {level.levelNumber}: {level.roomName}
                </p>
              ))}
              <p>Current choice: {selectedLevel}</p>
            </div>
          ) : null}
          {introState === 'section-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose section</p>
              {sections.map((section) => (
                <p key={section.id}>[{section.id}] Section {section.id}: {section.name}</p>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </TerminalFrame>
  )
}
