import { objectiveText } from '../game/narrative'

export default function ObjectivePanel() {
  return (
    <aside className="side-panel">
      <h2>Objective</h2>
      <p className="side-panel-label">Current Objective</p>
      <p className="side-panel-emphasis">{objectiveText.current}</p>
      <p className="side-panel-label">Future Objectives</p>
      <ul className="objective-list">
        {objectiveText.future.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>
    </aside>
  )
}
