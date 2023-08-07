import React, { useContext, useState } from 'react';
import { InputRange, InputRangesEditor } from './InputRangesEditor';
import { InputRangesTableContext, SpecContext } from './HerbieContext';
import { SpecRange, Spec } from './HerbieTypes';
import * as HerbieTypes from './HerbieTypes';
import * as utils from './utils';
import * as HerbieContext from './HerbieContext';
import KaTeX from 'katex';
import Modal from 'react-modal';
console.log("KaTeX:", KaTeX);

import './SpecComponent.css';
const math11 = require('mathjs11');

import * as fpcorejs from './fpcore';

function SpecComponent({ showOverlay, setShowOverlay }: { showOverlay: boolean, setShowOverlay: (showOverlay: boolean) => void }) {
  // const { spec: value, setSpec: setValue } = useContext(SpecContext);
  // const { inputRangesTable, setInputRangesTable } = useContext(InputRangesTableContext);
  const [value, setValue] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext)
  const [spec, setSpec] = useState(value || new Spec('sqrt(x + 1) - sqrt(x)', 0));
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)

  // When the spec is clicked, we show an overlay menu for editing the spec and the input ranges for each variable.
  // const [showOverlay, setShowOverlay] = useState(false);

  const handleSpecClick = () => {
    setShowOverlay(true);
  }

  const handleOverlayClick = () => {
    setShowOverlay(false);
  }

  // Wait until submit click to set the spec
  const handleSubmitClick = () => {
    const specId = spec.id + 1;
    const inputRangeId = utils.nextId(inputRangesTable)

    // Reset the expressions list if we are truly switching specs
    if (spec.expression !== value.expression) { setExpressions([]) }

    setValue(new Spec(spec.expression, specId));
    // TODO handle duplicates etc
    setInputRangesTable([...inputRangesTable, new HerbieTypes.InputRanges((inputRangesTable.findLast(r => r.specId === spec.id) as HerbieTypes.InputRanges).ranges, specId, inputRangeId)])
    setShowOverlay(false);
  }

  const specValid = () => {
    try {
      fpcorejs.mathjsToFPCore(spec.expression);

      // Check to make sure there is at least one variable
      if (fpcorejs.getVarnamesMathJS(spec.expression).length === 0) {
        return false
      }
    } catch (e) {
      return false
    }
    return true
  }

  function getVariables(spec: Spec): string[] {
    // TODO
    return specValid() ? fpcorejs.getVarnamesMathJS(spec.expression) : []
  }

  // Create a new Spec when the spec is submitted by clicking the done button
  const handleSpecTextUpdate: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setSpec(new Spec(event.target.value, spec.id));
  }

  const handleRangesUpdate = (value: { ranges: { [key: string]: InputRange } }) => {
    setSpec(new Spec(spec.expression, /*Object.entries(value.ranges).map(([variable, range], id) => new SpecRange(variable, parseFloat(range.lower), parseFloat(range.upper))),*/ spec.id));
  }

  return (
    <div className="spec-container">
      <div className="spec-title">
        <div className="spec-field">
          Spec:
        </div>
        <div className="spec-text" onClick={handleSpecClick}>{value.expression}</div>
      </div>
      <Modal
        isOpen={showOverlay}
        onRequestClose={() => setShowOverlay(false)}
      >
        <div className="spec-overlay" onClick={handleOverlayClick}>
          {/* Show a dialogue for editing the spec with a "done" button. */}
          <div className="spec-overlay-content" onClick={(event) => event.stopPropagation()}>
            <div className="spec-overlay-header">
              <div>Spec</div>
            </div>
            {/* Render the expression into HTML with KaTeX */}
            <div className="spec-tex" dangerouslySetInnerHTML={{
              __html: (() => {
                try {
                  // Check if there are no variables
                  if (fpcorejs.getVarnamesMathJS(spec.expression).length === 0) {
                    throw new Error("No variables detected.")
                  }

                  return KaTeX.renderToString(math11.parse(spec.expression).toTex(), { throwOnError: false })
                } catch (e) {
                  //throw e;
                  return (e as Error).toString()
                }
              })()
            }} />
            <textarea className="spec-textarea" value={spec.expression} onChange={handleSpecTextUpdate} />
            <InputRangesEditor value={{ ranges: Object.fromEntries(getVariables(spec).map(v => [v, { lower: '0', upper: '1' }])) }} setValue={handleRangesUpdate} />
            <div>
              <button onClick={handleSubmitClick} disabled={!specValid()}>Submit</button>
            </div>
          </div>
        </div>
      </Modal>
      {/* {showOverlay && } */}
    </div>
  );
}

export { SpecComponent };