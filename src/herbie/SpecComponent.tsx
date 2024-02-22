import React, { useCallback, ChangeEvent, useContext, useState, useEffect } from 'react';
import { InputRange, InputRangesEditor, InputRangeEditor1 } from './InputRangesEditor';
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
    const variables = getVariables(spec)
    // Reset the expressions list if we are truly switching specs
    if (spec.expression !== value.expression) { setArchivedExpressions(expressions.map(e => e.id)) }

    const expression = await ensureMathJS(spec.expression, serverUrl);

    const inputRanges = new HerbieTypes.InputRanges(
      mySpecRanges.filter(async (range) => (await variables).includes(range.variable)),
      specId,
      inputRangeId)
    console.debug('Adding to inputRangesTable: ', inputRanges)
    setInputRangesTable([...inputRangesTable, inputRanges])
    const mySpec = new Spec(expression, specId);
    console.debug('Added, now setting spec', mySpec)

    // Add to derivations
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
    return await specValid() ? fpcorejs.getVarnamesMathJS(spec.expression) : []
  }

  // function debounce(func: any, timeout = 300){
  //   let timer: NodeJS.Timeout;
  //   return (...args: any[]) => {
  //     clearTimeout(timer);
  //     //@ts-ignore
  //     timer = setTimeout(() => { func.apply(this, ...args); }, timeout);
  //   };
  // }

  // function debounce(func: any, wait: number, immediate :boolean = false) {
  //   // 'private' variable for instance
  //   // The returned function will be able to reference this due to closure.
  //   // Each call to the returned function will share this common timer.
  //   var timeout: NodeJS.Timeout | null;

  //   // Calling debounce returns a new anonymous function
  //   return function() {
  //     // reference the context and args for the setTimeout function
  //     // @ts-ignore
  //     var context = this,
  //       args = arguments;

  //     // Should the function be called now? If immediate is true
  //     //   and not already in a timeout then the answer is: Yes
  //     var callNow = immediate && !timeout;

  //     // This is the basic debounce behaviour where you can call this
  //     //   function several times, but it will only execute once
  //     //   (before or after imposing a delay).
  //     //   Each time the returned function is called, the timer starts over.
  //     clearTimeout(timeout!);

  //     // Set the new timeout
  //     timeout = setTimeout(function() {

  //       // Inside the timeout function, clear the timeout variable
  //       // which will let the next execution run when in 'immediate' mode
  //       timeout = null;

  //       // Check if the function already ran with the immediate flag
  //       if (!immediate) {
  //         // Call the original function with apply
  //         // apply lets you define the 'this' object as well as the arguments
  //         //    (both captured before setTimeout)
  //         func.apply(context, args);
  //       }
  //     }, wait);

  //     // Immediate mode and no wait timer? Execute the function...
  //     if (callNow) { func.apply(context, args); }
  //   }
  // }

  // Create a new Spec when the spec is submitted by clicking the done button
  const handleSpecTextUpdate : React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (event.target.value.trim().includes('fpcore')) {
      setSpec(new Spec(event.target.value.trim(), spec.id, event.target.value.trim()));
    } else {
      setSpec(new Spec(event.target.value.trim(), spec.id));
    }
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
          validateSpecExpression(expr);
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
        <div className="spec-field">
          Spec:
        </div>
        <div className="spec-text" onClick={handleSpecClick}>{value.expression}</div>
      </div>
      <Modal
        isOpen={showOverlay}
        onRequestClose={() => setShowOverlay(false)}
        ariaHideApp={false}
      >
        <div className="spec-overlay" onClick={handleOverlayClick}>
          {/* Show a dialogue for editing the spec with a "done" button. */}
          <div className="spec-overlay-content" onClick={(event) => event.stopPropagation()}>
            <div className="spec-overlay-header">
              <div>Spec</div>
            </div>
            <DebounceInput element="textarea" debounceTimeout={300} className="spec-textarea" value={spec.expression} onChange={handleSpecTextUpdate} />
            {/* Render the expression into HTML with KaTeX */}
            <div className="spec-tex" dangerouslySetInnerHTML={{
              __html: htmlContent
            }} />
            <div className="spec-range-inputs">
            {variables.map((v, i) => {
              const range = mySpecRanges.find(r => r.variable === v) || new HerbieTypes.SpecRange(v, -1e308, 1e308);
              return <div className="spec-range-input" key={v}>
                <div className="varname">
                  {v}:
                </div>
                <InputRangeEditor1 value={{
                lower: range.lowerBound.toString(),
                upper: range.upperBound.toString()
              }} setValue={
                (value: { lower: string, upper: string }) => {
                  console.debug('set input range', v, value)
                  if (mySpecRanges.map(r => r.variable).includes(v)) {
                    setMySpecRanges(mySpecRanges.map(r => r.variable === v ? new HerbieTypes.SpecRange(v, parseFloat(value.lower), parseFloat(value.upper)) : r))
                  } else {
                    const newSpecRanges = [...mySpecRanges, new HerbieTypes.SpecRange(v, parseFloat(value.lower), parseFloat(value.upper))]
                    setMySpecRanges(newSpecRanges.filter(r => variables.includes(r.variable)))
                  }
                }
              } />
              </div>
            })}
            </div>
            {/* <div className='spec-input-range-editor'>
              <InputRangesEditor
              value={{ ranges: Object.fromEntries(getVariables(spec).map(v => [v, { lower: '0', upper: '1' }])) }}
              setValue={handleRangesUpdate}
              />
            </div> */}
            <div className="submit">
              <button onClick={handleSubmitClick} disabled={!specValid()}>Submit</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export { SpecComponent };
