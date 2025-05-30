import React, { useState, useEffect } from 'react';
import { DebounceInput } from 'react-debounce-input';
import KaTeX from 'katex';

import { SpecRange, Spec, InputRanges, RangeInSpecFPCore } from './HerbieTypes';
import * as HerbieContext from './HerbieContext';
import { InputRangeEditor1 } from './InputRangesEditor';
import { expressionToTex } from './ExpressionTable';

import { nextId } from './lib/utils';
import * as fpcorejs from './lib/fpcore';
import { fPCoreToMathJS } from './lib/herbiejs';

import './sliders.css';
import './SpecComponent.css';

async function ensureMathJS(expression: string, serverUrl: string): Promise<string> {
  if (expression.includes("FPCore")) {
    return await fPCoreToMathJS(expression, serverUrl);
  }

  return expression
}

function SpecComponent({setShowExplore}: {setShowExplore: () => void}) {
  const [value, setValue] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [spec, setSpec] = useState(new Spec('', 0));
  const [specTextInput, setSpecTextInput] = useState(spec.expression);
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext)
  const [expressions,] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [mySpecRanges, setMySpecRanges] = useState(() => {
    const foundRange = inputRangesTable.findLast(r => r.specId === spec.id);
    if (foundRange && 'ranges' in foundRange) { return foundRange.ranges || []; }
    else { return []; }
  });
  const [, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  const specExpressionErrors = (expression: string) => {
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

  // Wait until submit click to set the spec
  const handleSubmitClick = async () => {
    const specId = value.id + 1;
    const inputRangeId = nextId(inputRangesTable)
    const variables = await getVariables(spec)
    // Reset the expressions list if we are truly switching specs
    if (spec.expression !== value.expression) { setArchivedExpressions(expressions.map(e => e.id)) }

    const mathJSExpression = await ensureMathJS(spec.expression, serverUrl);

    let inputRanges, mySpec;
    let inpuRangeLowerBound, inputRangeUpperBound;
    if (spec.expression.includes("FPCore")) {
      inputRanges = new RangeInSpecFPCore(
        specId,
        inputRangeId
      )
      
      mySpec = new Spec(mathJSExpression, specId, spec.expression);

    } else {
      inputRanges = new InputRanges(
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

    if (!sessionStorage.getItem('sessionId')) {
      const sessionId = Date.now().toString();
      sessionStorage.setItem('sessionId', sessionId);
    }

    // **Extract Input Ranges for Logging**
    const inputRangesData = mySpecRanges.map(range => ({
      variable: range.variable,
      lowerBound: range.lowerBound,
      upperBound: range.upperBound
    }));
    fetch('https://herbie.uwplse.org/odyssey-log/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: "SpecEntry",
        sessionId: sessionStorage.getItem('sessionId'),
        expression: spec.expression,
        variableInfo: inputRangesData,
        timestamp: new Date().toLocaleString(),
      }),
    })
    .then(response => {
      if (response.ok) {
        
        console.log('Server is running and log saved');
      }
      else {
        console.error('Server responded with an error:', response.status);
      }
    })
    .catch(error => console.error('Request failed:', error));

    setShowExplore();
  }

  const specValid = async (spec: Spec) => {
    if (spec.expression.length === 0) {
      return false
    }
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
    return await specValid(spec) ? fpcorejs.getVarnamesMathJS(expr) : []
  }

  const handleSpecTextUpdate: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    let v = event.target.value.trim();
    // Replace '**' with '^' and 'e^' (not preceded by a word char) with 'exp'
    v = v.replace(/\*\*/g, '^').replace(/(?<![\w])e\^/g, 'exp');
    if (v.includes('FPCore')) {
      setSpec(new Spec(v, spec.id, v));
    } else {
      setSpec(new Spec(v, spec.id));
    }
    setSpecTextInput(event.target.value);
  }

  const [htmlContent, setHtmlContent] = useState('')
  useEffect(() => {
    async function getResult() {
      const result = await (async () => {
        try {
          // Check if there are no variables
          const expr = await ensureMathJS(spec.expression, serverUrl)

          const numVars = fpcorejs.getVarnamesMathJS(expr).length;
          if (numVars === 0) {
            throw new Error("No variables detected.")
          }
          await (validateSpecExpression(expr));
          return KaTeX.renderToString(await expressionToTex(expr, numVars, serverUrl), { throwOnError: false })
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

  const handleShowExample = () => {
    setUsingFPCore(false);
    setSpec(new Spec('sqrt(x + 1) - sqrt(x)', spec.id));
    setSpecTextInput('sqrt(x + 1) - sqrt(x)');
  }

  const [disabled, setDisabled] = useState(true)
  useEffect(() => {
    async function getResult() {
      const valid = await specValid(spec)
      setDisabled(!valid)
    }
    setDisabled(true)
    getResult()
  }, [spec])

  const [usingFPCore, setUsingFPCore] = useState(false)
  const handleToggleUseFPCore = () => {
    setUsingFPCore(!usingFPCore);
    setSpecTextInput('');
    setSpec(new Spec('', spec.id));
  }

  const ExpressionInputHeader = (
    <div className="expression-input-header">
      <a
        className="showExample action"
        href="#"
        onClick={handleShowExample}
      >
        Show an example expression
      </a>
      {/* Use mathjs <=> Use FPCore toggle switch */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1em",
        }}
        onClick={handleToggleUseFPCore}
      >
        <span
          style={{
            fontWeight: "bold",
            color: usingFPCore ? "gray" : "black",
          }}
        >
          Use mathjs
        </span>
        <label className="switch">
          <input type="checkbox" disabled checked={usingFPCore} />
          <span className="slider round"></span>
        </label>
        <span
          style={{
            fontWeight: "bold",
            color: usingFPCore ? "black" : "gray",
          }}
        >
          Use FPCore
        </span>
      </div>
    </div>
  );

  const SpecTextarea = (
    <DebounceInput
      element={usingFPCore ? "textarea" : "input"}
      debounceTimeout={300}
      rows={!usingFPCore ? 1 : 4}
      className="spec-textarea"
      placeholder={
        usingFPCore
          ? `e.g. (FPCore (x) :pre (>= x 0) (- (sqrt (+ x 1)) (sqrt x)))`
          : "e.g. sqrt(x+1) - sqrt(x)"
      }
      value={specTextInput}
      onChange={handleSpecTextUpdate}
    />
  );

  // make sure the ranges get initialized; works because useEffect runs *after* render
  useEffect(() => {
    const vars = variables;
    const newRanges = vars.map((v) => {
      const range = mySpecRanges.find((r) => r.variable === v) || new SpecRange(v, -1e308, 1e308, 0);
      return range;
    });
    setMySpecRanges(newRanges);
  }, [variables]);

  return (
    <div className="spec-page">
      <div className="spec-logo">
        <div>
          <img
            src="https://raw.githubusercontent.com/herbie-fp/odyssey/main/images/odyssey-icon.png"
            alt="Odyssey logo"
            style={{ width: "100px" }}
          />
        </div>
        <div>Explore Floating-Point Error</div>
      </div>
      <div className="spec-header">
        Write a formula below. Enter approximate ranges for inputs.
      </div>
      {ExpressionInputHeader}
      {SpecTextarea}
      {/* Render the expression into HTML with KaTeX */}
      <div
        className="spec-details"
        style={{
          marginLeft: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "7.5px",
          width: "calc(100% - 30px)",
        }}
      >
        {spec.expression.length > 0 && (
          <div
            className="spec-tex"
            style={{
              maxWidth: "100%",
              overflowX: 'auto',
              overflowY: 'hidden',
              // color red if the expression is invalid
              color: htmlContent.includes("Error") ? "red" : "black",
              padding: "10px 0",
            }}
            dangerouslySetInnerHTML={{
              __html: htmlContent,
            }}
          />
        )}

        {spec.expression.indexOf("FPCore") === -1 && (
          <div
            className="spec-range-inputs"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {variables.map((v, i) => {
              const range =
                mySpecRanges.find((r) => r.variable === v) ||
                new SpecRange(v, -1e308, 1e308, 0);
              return (
                <div className="spec-range-input" key={v}>
                  <div className="varname">{v}:</div>
                  <InputRangeEditor1
                    value={{
                      varname: v,
                      lower: range.lowerBound.toString(),
                      upper: range.upperBound.toString(),
                      minAbsValue: range.minAbsValue.toString()
                    }}
                    setValue={(value: { lower: string; upper: string, minAbsValue?: string }) => {
                      console.debug("set input range", v, value);
                      if (mySpecRanges.map((r) => r.variable).includes(v)) {
                        setMySpecRanges(
                          mySpecRanges.map((r) =>
                            r.variable === v
                              ? new SpecRange(
                                  v,
                                  parseFloat(value.lower),
                                  parseFloat(value.upper),
                                  value.minAbsValue !== undefined ? parseFloat(value.minAbsValue) : undefined
                                )
                              : r
                          )
                        );
                      } else {
                        const newSpecRanges = [
                          ...mySpecRanges,
                          new SpecRange(
                            v,
                            parseFloat(value.lower),
                            parseFloat(value.upper)
                          ),
                        ];
                        setMySpecRanges(
                          newSpecRanges.filter((r) =>
                            variables.includes(r.variable)
                          )
                        );
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!disabled && (
        <>
          <hr></hr>
          <button
            className="explore-button"
            onClick={handleSubmitClick}
          >
            Explore
          </button>
        </>
      )}

      {/* TODO this nesting p > dl is bad apparently, shows console error */}
      <div className="mathjs-instructions" style={{ display: "block", alignSelf: 'center' }}>
        <div>
          Use ordinary mathematical syntax (parsed by{" "}
          <a href="https://mathjs.org">math.js</a>) and{" "}
          <a href="https://herbie.uwplse.org/doc/2.1/input.html#heading-2">
            standard functions
          </a>{" "}
          like:
        </div>
        <dl className="function-list">
          <dt>+, -, *, /, abs</dt>
          <dd>The usual arithmetic functions</dd>
          <dt>and, or</dt>
          <dd>Logical connectives (for preconditions)</dd>
          <dt>pow</dt>
          <dd>Raising a value to a power</dd>
          <dt>exp, log</dt>
          <dd>Natural exponent and natural log</dd>
          <dt>sin, cos, tan</dt>
          <dd>The trigonometric functions</dd>
          <dt>asin, acos, atan</dt>
          <dd>The inverse trigonometric functions</dd>
          <dt>sqrt, cbrt</dt>
          <dd>Square and cube roots</dd>
          <dt>PI, E</dt>
          <dd>The mathematical constants</dd>
        </dl>
      </div>

      <div
        className="acknowledgments"
        style={{ fontSize: "small", marginTop: "2em", textAlign: 'center' }}
      >
        This material is based upon work supported by the National Science Foundation 
        under Grant No. CNS-2346394.
      </div>
    </div>
  );
}

export { SpecComponent };
