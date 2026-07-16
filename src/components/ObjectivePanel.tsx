import { objectiveText } from '../game/narrative'
import type { LevelMeta } from '../game/levels'

import { memo } from 'react'

type ObjectivePanelProps = {
  levelMeta: LevelMeta
}

export default memo(function ObjectivePanel({ levelMeta }: ObjectivePanelProps) {
  return (
    <aside className="side-panel">
      <h2>Objective</h2>
      <p className="side-panel-label">Current Room</p>
      <p className="side-panel-emphasis">
        Section {levelMeta.sectionNumber}: {levelMeta.sectionName}
      </p>
      <p className="side-panel-emphasis">
        Room {levelMeta.id}: {levelMeta.roomName}
      </p>
      <p className="side-panel-label">Current Objective</p>
      <p className="side-panel-emphasis">{levelMeta.objective}</p>
      <p className="side-panel-label">Future Objectives</p>
      <ul className="objective-list">
        {objectiveText.future.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
    </aside>
  )
})
