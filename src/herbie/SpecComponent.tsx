import React, { useCallback, ChangeEvent, useContext, useState, useEffect } from 'react';
import { InputRange, InputRangeEditor1 } from './InputRangesEditor';
import { InputRangesTableContext, SpecContext } from './HerbieContext';
import { SpecRange, Spec } from './HerbieTypes';
import * as HerbieTypes from './HerbieTypes';
import * as utils from './lib/utils';
import * as HerbieContext from './HerbieContext';
import KaTeX from 'katex';
import Modal from 'react-modal';

import { DebounceInput, DebounceTextArea } from 'react-debounce-input';
console.log("KaTeX:", KaTeX);

import './SpecComponent.css';
const math11 = require('mathjs11');

import * as fpcorejs from './lib/fpcore';
import { fPCoreToMathJS } from './lib/herbiejs';

async function ensureMathJS(expression: string, serverUrl: string): Promise<string> {
  if (expression.includes("FPCore")) {
    return await fPCoreToMathJS(expression, serverUrl);
  }

  return expression
}

function SpecComponent({ showOverlay, setShowOverlay }: { showOverlay: boolean, setShowOverlay: (showOverlay: boolean) => void }) {
  // const { spec: value, setSpec: setValue } = useContext(SpecContext);
  // const { inputRangesTable, setInputRangesTable } = useContext(InputRangesTableContext);
  const [value, setValue] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext)
  const [spec, setSpec] = useState(value || new Spec('sqrt(x + 1) - sqrt(x)', 0));
  const [specTextInput, setSpecTextInput] = useState(spec.expression);
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  const [mySpecRanges, setMySpecRanges] = useState(() => {
    const foundRange = inputRangesTable.findLast(r => r.specId === spec.id);
    if (foundRange && 'ranges' in foundRange) { return foundRange.ranges || []; }
    else { return []; }
  });
  const [, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)
  const [serverUrl, setServerUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  const specExpressionErrors = (expression: string) =>  {
    const functionNames = Object.keys(fpcorejs.SECRETFUNCTIONS).concat(Object.keys(fpcorejs.FUNCTIONS));
    const expressionVariables = fpcorejs.getVarnamesMathJS(expression);
    const functionNamedVariables = expressionVariables.filter((symbol) => functionNames.includes(symbol));
    if (functionNamedVariables.length !== 0) {
      const functionVariableString = functionNamedVariables.join(", ");
      const errorMessage =
        "The added expression is not valid. The expression you tried to add has the following variables that have the same name as FPCore functions: " +
        functionVariableString;
      return [errorMessage];
    }
    return [];
  }

  const validateSpecExpression = async (expression: string) => {
    expression = await ensureMathJS(expression, serverUrl)

    const errors = specExpressionErrors(expression);
    if (errors.length !== 0) {
      throw new Error(errors[0])
    }
  }
  // When the spec is clicked, we show an overlay menu for editing the spec and the input ranges for each variable.
  // const [showOverlay, setShowOverlay] = useState(false);

  const handleSpecClick = () => {
    setShowOverlay(true);
  }

  const handleOverlayClick = () => {
    setShowOverlay(false);
  }

  // Wait until submit click to set the spec
  const handleSubmitClick = async () => {
    const specId = value.id + 1;
    const inputRangeId = utils.nextId(inputRangesTable)
    const variables = await getVariables(spec)
    // Reset the expressions list if we are truly switching specs
    if (spec.expression !== value.expression) { setArchivedExpressions(expressions.map(e => e.id)) }

    const mathJSExpression = await ensureMathJS(spec.expression, serverUrl);

    let inputRanges, mySpec;
    if (spec.expression.includes("FPCore")) {
      inputRanges = new HerbieTypes.RangeInSpecFPCore(
        specId,
        inputRangeId
      )

      mySpec = new Spec(mathJSExpression, specId, spec.expression);

    } else {
      inputRanges = new HerbieTypes.InputRanges(
        mySpecRanges.filter((range) => variables.includes(range.variable)),
        specId,
        inputRangeId
      )
      console.debug('inputRanges', inputRanges)

      mySpec = new Spec(mathJSExpression, specId)
    }

    console.debug('Adding to inputRangesTable: ', inputRanges)
    setInputRangesTable([...inputRangesTable, inputRanges])

    console.debug('Added, now setting spec', mySpec)
    setValue(mySpec);

    setShowOverlay(false);
  }

  const specValid = async () => {
    const expr = await ensureMathJS(spec.expression, serverUrl)

    try {
      fpcorejs.mathjsToFPCore(expr);

      // Check to make sure there is at least one variable
      if (fpcorejs.getVarnamesMathJS(expr).length === 0) {
        return false
      }
    } catch (e) {
      return false
    }
    if (specExpressionErrors(expr).length !== 0) {
      return false
    }
    return true
  }

  async function getVariables(spec: Spec): Promise<string[]> {
    const expr = await ensureMathJS(spec.expression, serverUrl)
    return await specValid() ? fpcorejs.getVarnamesMathJS(expr) : []
  }

  const handleSpecTextUpdate : React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const v = event.target.value.trim()
    if (v.includes('FPCore')) {
      setSpec(new Spec(v, spec.id, v));
    } else {
      setSpec(new Spec(v, spec.id));
    }
    setSpecTextInput(event.target.value);
  }

  const handleRangesUpdate = (value: { ranges: { [key: string]: InputRange } }) => {
    setMySpecRanges(Object.entries(value.ranges).map(([variable, range], id) => new SpecRange(variable, parseFloat(range.lower), parseFloat(range.upper))))
    // setSpec(new Spec(spec.expression, /*Object.entries(value.ranges).map(([variable, range], id) => new SpecRange(variable, parseFloat(range.lower), parseFloat(range.upper))),*/ spec.id));
  }

  const [htmlContent, setHtmlContent] = useState('')
  useEffect(() => {
    async function getResult() {
      const result = await (async () => {
        try {
          // Check if there are no variables
          const expr = await ensureMathJS(spec.expression, serverUrl)

          if (fpcorejs.getVarnamesMathJS(expr).length === 0) {
            throw new Error("No variables detected.")
          }
          await (validateSpecExpression(expr));
          return KaTeX.renderToString(math11.parse(expr).toTex(), { throwOnError: false })
        } catch (e) {
          //throw e;
          return (e as Error).toString()
        }
      })()
      setHtmlContent(result)
    }
    getResult()
  }, [spec])

  const [variables, setVariables] = useState([''])
  useEffect(() => {
    async function getResult() {
      const vars = await getVariables(spec);
      setVariables(vars);
    }
    getResult();
  }, [spec]);

  return (
    <div className="spec-container">
      <div className="spec-title">
        <div className="spec-text" onClick={handleSpecClick}>{value.expression}</div>
      </div>
      <Modal
        isOpen={showOverlay}
        onRequestClose={async () => {
          // submit the spec if the user closes the overlay
          // don't allow close if the spec is invalid
          const valid = await specValid()
          if (valid) {
            await handleSubmitClick()
            setShowOverlay(false)
          }
        }}
        ariaHideApp={false}
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          },
          content: {
            backgroundColor: 'var(--background-color)',
            top: '2px',
            left: '2px',
            right: '2px',
            bottom: '2px',
          }
        
        }
        }
      >
        {/* <div className="spec-overlay" onClick={handleOverlayClick}> */}
          {/* Show a dialogue for editing the spec with a "done" button. */}
          {/* <div className="spec-overlay-content" onClick={(event) => event.stopPropagation()}> */}
            <div className="spec-overlay-header">
              Specify the expression to rewrite
        </div>
        <div className="spec-textarea-container">
          <DebounceInput element="textarea" debounceTimeout={300} rows={1} className="spec-textarea" placeholder="e.g. sqrt(x+1) - sqrt(x)" value={specTextInput} onChange={handleSpecTextUpdate} />
          </div>
            {/* Render the expression into HTML with KaTeX */}
            <div className="spec-tex" dangerouslySetInnerHTML={{
              __html: htmlContent
            }} />

            {spec.expression.indexOf('FPCore') === -1 && (
              <div className="spec-range-inputs">
                {variables.map((v, i) => {
                  const range = mySpecRanges.find(r => r.variable === v) || new HerbieTypes.SpecRange(v, -1e308, 1e308);
                  return (
                    <div className="spec-range-input" key={v}>
                      <div className="varname">
                        {v}:
                      </div>
                      <InputRangeEditor1
                        value={{
                          varname: v,
                          lower: range.lowerBound.toString(),
                          upper: range.upperBound.toString()
                        }}
                        setValue={(value: { lower: string, upper: string }) => {
                          console.debug('set input range', v, value);
                          if (mySpecRanges.map(r => r.variable).includes(v)) {
                            setMySpecRanges(mySpecRanges.map(r => r.variable === v ? new HerbieTypes.SpecRange(v, parseFloat(value.lower), parseFloat(value.upper)) : r));
                          } else {
                            const newSpecRanges = [...mySpecRanges, new HerbieTypes.SpecRange(v, parseFloat(value.lower), parseFloat(value.upper))];
                            setMySpecRanges(newSpecRanges.filter(r => variables.includes(r.variable)));
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* <div className='spec-input-range-editor'>
              <InputRangesEditor
              value={{ ranges: Object.fromEntries(getVariables(spec).map(v => [v, { lower: '0', upper: '1' }])) }}
              setValue={handleRangesUpdate}
              />
            </div> */}
            <div className="submit">
              <button onClick={handleSubmitClick} disabled={!specValid()}>Explore</button>
            </div>
          {/* </div> */}
        {/* </div> */}
      </Modal>
    </div>
  );
}

export { SpecComponent };
