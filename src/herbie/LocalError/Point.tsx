import './Point.css'
// React component
// encapsulates: 
// varnames.map((varname, i) => (
//   <div className="selected-point-variable" key={i}>
//   <div className="selected-point-variable-name">{varname}:</div>
//   <div className="selected-point-variable-value">{selectedPoint?.[i]}</div>
// </div>
// ))

// takes a dictionary of variable names to values
// and renders them as x: 1, y: 2, z: 3 etc.
export function Point({values} : {values: { [key: string]: number }}) {
  return (
    <div className="point">
      {
        Object.entries(values).map(([varname, value]) => (
          <div className="point-variable" key={varname}>
            <div className="point-variable-name">{varname}:</div>
            <div className="point-variable-value">{value}</div>
          </div>
        ))
      }
    </div>
  )
}