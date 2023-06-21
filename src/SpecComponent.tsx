import React, { useContext, useState } from 'react';
import { InputRange, InputRangesEditor } from './InputRangesEditor';
import { SpecContext } from './HerbieContext';
import { SpecRange, Spec } from './HerbieTypes';
import KaTeX from 'katex';

import './SpecComponent.css';
const math11 = require('mathjs11');

function SpecComponent() {
  const { spec: value, setSpec: setValue } = useContext(SpecContext);
  const [spec, setSpec] = useState(value || new Spec('sqrt(x + 1) - sqrt(x)', [new SpecRange('x', -1e308, 1e308, 0)], 0));
  
  // When the spec is clicked, we show an overlay menu for editing the spec and the input ranges for each variable.
  const [showOverlay, setShowOverlay] = useState(false);
  
  const handleSpecClick = () => {
    setShowOverlay(true);
  }
  const handleOverlayClick = () => {
    setShowOverlay(false);
  }
  // Wait until submit click to set the spec
  const handleSubmitClick = () => {
    setValue(spec);
  }
  
  function getVariables(spec: Spec) : string[] {
    // TODO
    return ['x']
  }

  // Create a new Spec when the spec is submitted by clicking the done button
  const handleSpecChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setSpec(new Spec(event.target.value, spec.ranges, spec.id));
  }
  const handleRangesUpdate = (value: { ranges: { [key: string]: InputRange } }) => {
    setSpec(new Spec(spec.expression, Object.entries(value.ranges).map(([variable, range], id) => new SpecRange(variable, parseFloat(range.lower), parseFloat(range.upper), id)), spec.id));
  }
  return (
    <div className="spec-container">
      <div className="spec-text" onClick={handleSpecClick}>{spec.expression}</div>
      {showOverlay && <div className="spec-overlay" onClick={handleOverlayClick}>
        {/* Show a dialogue for editing the spec with a "done" button. */}
        <div className="spec-overlay-content" onClick={(event) => event.stopPropagation()}>
          <div className="spec-overlay-header">
            <div>Spec</div>
            <button onClick={handleSubmitClick}>Done</button>
          </div>
          {/* Render the expression into HTML with KaTeX */}
          <div className="spec-tex" dangerouslySetInnerHTML={{ __html: (() => { try { return KaTeX.renderToString(math11.parse(spec.expression).toTex(), { throwOnError: false }) } catch (e) { return (e as Error).toString() } })() }} />
          <textarea className="spec-textarea" value={spec.expression} onChange={handleSpecChange} />
          <InputRangesEditor value={{ ranges: Object.fromEntries(getVariables(spec).map(v => [v, { lower: '0', upper: '1' }])) }} setValue={handleRangesUpdate} />
        </div>
      </div>}
    </div>
  );
}

export { SpecComponent };