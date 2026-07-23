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

  function continueIntro(currentState = introState) {
    if (currentState === 'title') {
      setIntroState('story')
      return
    }
    if (currentState === 'story') {
      setIntroState('mode-select')
    }
  }

  function chooseMode(nextDifficulty: GameDifficulty) {
    setSelectedDifficulty(nextDifficulty)
    setSelectedSection(1)
    setSelectedLevel(1)
    setIntroState('section-select')
  }

  function chooseSection(nextSection: SectionChoice) {
    const firstLevel = getSectionLevels(nextSection)[0]?.levelNumber ?? 1
    setSelectedSection(nextSection)
    setSelectedLevel(firstLevel)
    setIntroState('level-select')
  }

  function chooseLevel(nextLevel: LevelChoice) {
    const isAvailableLevel = selectedLevelOptions.some(
      (level) => level.levelNumber === nextLevel,
    )
    if (!isAvailableLevel || levelSelectTransitionRef.current) return

    levelSelectTransitionRef.current = true
    setSelectedLevel(nextLevel)
    setIntroState('game')
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()

      if (introState === 'title' || introState === 'story') {
        continueIntro(introState)
        return
      }

      if (introState === 'mode-select') {
        if (event.repeat || (event.key !== '1' && event.key !== '2')) return
        chooseMode(event.key === '2' ? 'hard' : 'normal')
        return
      }

      if (introState === 'section-select') {
        if (event.repeat || (event.key !== '1' && event.key !== '2')) return
        chooseSection(Number(event.key) as SectionChoice)
        return
      }

      if (introState === 'level-select') {
        if (event.repeat) return
        chooseLevel(Number(event.key) as LevelChoice)
      }
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
        <section
          className={`title-screen ${introState === 'title' || introState === 'story' ? 'title-screen--clickable' : ''}`}
          onClick={() => {
            if (introState === 'title' || introState === 'story') {
              continueIntro()
            }
          }}
        >
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
            introState === 'title' || introState === 'story' ? (
              <button
                type="button"
                className="prompt prompt-button prompt--continue"
                onClick={(event) => {
                  event.stopPropagation()
                  continueIntro()
                }}
              >
                {introContinuePrompt}
              </button>
            ) : (
              <p className="prompt">Choose level</p>
            )
          ) : null}
          {introState === 'mode-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose mode</p>
              <button
                type="button"
                className="level-select-option"
                onClick={() => chooseMode('normal')}
              >
                [1] Normal Mode
              </button>
              <button
                type="button"
                className="level-select-option"
                onClick={() => chooseMode('hard')}
              >
                [2] Hard Mode
              </button>
            </div>
          ) : null}
          {introState === 'level-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose level</p>
              <p>Section {selectedSection}: {selectedLevelMeta.sectionName}</p>
              {selectedLevelOptions.map((level) => (
                <button
                  key={level.levelNumber}
                  type="button"
                  className="level-select-option"
                  onClick={() => chooseLevel(level.levelNumber)}
                >
                  [{level.levelNumber}] Level {level.levelNumber}: {level.roomName}
                </button>
              ))}
              <p>Current choice: {selectedLevel}</p>
            </div>
          ) : null}
          {introState === 'section-select' ? (
            <div className="level-select-screen">
              <p className="level-select-screen__title">Choose section</p>
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className="level-select-option"
                  onClick={() => chooseSection(section.id)}
                >
                  [{section.id}] Section {section.id}: {section.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </TerminalFrame>
  )
}
