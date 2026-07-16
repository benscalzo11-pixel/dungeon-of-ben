import type { LevelMeta } from '../game/levels'
import ObjectivePanel from './ObjectivePanel'
import StatusBar from './StatusBar'

type GameDifficulty = 'normal' | 'hard'

type EmptyLevelScreenProps = {
  levelMeta: LevelMeta
  difficulty: GameDifficulty
}

const emptyRows = [
  '###########',
  '#@........#',
  '#.........#',
  '#.........#',
  '###########',
]

export default function EmptyLevelScreen({
  levelMeta,
  difficulty,
}: EmptyLevelScreenProps) {
  return (
    <section className="game-screen">
      <section className="main-panel" aria-label={`${levelMeta.roomName} empty room`}>
        <div className="empty-level">
          <pre className="empty-level-map" aria-label="Empty starter room">
            {emptyRows.join('\n')}
          </pre>
        </div>
      </section>
      <section className="side-column">
        <ObjectivePanel levelMeta={levelMeta} />
        <aside className="side-panel">
          <section className="side-section">
            <h2>Workspace</h2>
            <p>Section {levelMeta.sectionNumber}: {levelMeta.sectionName}</p>
            <p>Level {levelMeta.levelNumber}: {levelMeta.roomName}</p>
            <p>Mode: {difficulty === 'hard' ? 'Hard' : 'Normal'}</p>
          </section>
        </aside>
      </section>
      <StatusBar
        mode="normal"
        message="The Split Hall is empty."
        commandInput=""
        isCommandOpen={false}
        playerHealth={1}
        levelMeta={levelMeta}
      />
    </section>
  )
}
