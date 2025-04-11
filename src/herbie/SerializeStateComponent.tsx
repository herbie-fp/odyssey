import { useEffect, useState } from 'react';
import Modal from 'react-modal';

import { Derivation, Expression, InputRanges, RangeInSpecFPCore, SpecRange } from './HerbieTypes';
import * as HerbieTypes from './HerbieTypes';
import * as HerbieContext from './HerbieContext';
import { nextId } from './lib/utils';
import * as fpcorejs from './lib/fpcore';
import { fPCoreToMathJS } from './lib/herbiejs';

const { Octokit } = require("@octokit/core");

type exportStateProps = {
  specPage: boolean
}


// Following functions copied from SpecComponent.tsx, could instead export from
// that file or both export from a common location
async function ensureMathJS(expression: string, serverUrl: string): Promise<string> {
  if (expression.includes("FPCore")) {
    return await fPCoreToMathJS(expression, serverUrl);
  }
  return expression;
}

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

const specValid = async (expression: string, serverUrl: string) => {
  if (expression.length === 0) {
    return false
  }
  const expr = await ensureMathJS(expression, serverUrl)

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

/**
 * State export button that opens modal with "copy state" as JSON option
 */
function SerializeStateComponent(props: exportStateProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [importState, setImportState] = useState<string>("");

  // Global variables to be exported with 
  const [serverUrl, setServerUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext);
  const [fptaylorServerUrl, setFPTaylorServerUrl] = HerbieContext.useGlobal(HerbieContext.FPTaylorServerContext);
  const [fpbenchServerUrl, setFPBenchServerUrl] = HerbieContext.useGlobal(HerbieContext.FPBenchServerContext);
  const [spec, setSpec] = HerbieContext.useGlobal(HerbieContext.SpecContext);
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext);
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext);
  const [ , setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext);
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext);
  const [expandedExpressions, setExpandedExpressions] = HerbieContext.useGlobal(HerbieContext.ExpandedExpressionsContext);
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext);
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext);
  // saving gist
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  useEffect(() => {
    setGistUrl(null);
    setCopied(false);
  }, [spec.expression]);
  // scuffed way to encode auth token
  const a = "github_pat_"
  const b = "11BP25ESI0K9qgEcDPIghe_"
  const c = "6hPulnaPCzFUlqLGzSvMc0JnSuo"
  const d = "ZMVunRNAVhzJ0vidBU6JT3PF71DE1swJ"

  const stateToJson = (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    // Get ranges associated with spec - ids (will be recomputed on import), 
    // (meaning undefined, don't jsonify, if RangeInSpecFPCore)
    const inputRange = inputRangesTable.findLast(r => r.specId === spec.id);
    const specRanges = (inputRange instanceof HerbieTypes.InputRanges) ? inputRange.ranges : undefined;
    
    // Removing ids from export state
    // Selected Expressions
    const newExpressions: Expression[] = [];
    for (const expression of expressions) {
      if (expression.specId === spec.id) {
        newExpressions.push(expression);
      }
    }
    
    // list of HTMLHistory derivations
    // derivation.id represents the expression the derivation belongs to
    const newDerivations: Derivation[] = [];
    for (const derivation of derivations) {
      if (expressions.find(e => e.id === derivation.id && e.specId === spec.id) !== undefined) {
        newDerivations.push(derivation)
      }
    }

    const state = {
      serverUrl,
      fptaylorServerUrl,
      fpbenchServerUrl,
      spec,
      specRanges,
      expressions: newExpressions,
      derivations: newDerivations,
      selectedExprId,
      compareExprIds,
      expandedExpressions,
    }

    const createGist = async () => {
      const octokit = new Octokit({
          auth: a+b+c+d
      });

      try {
          const fileName = `Example_${spec.expression}_.txt`;
          const response = await octokit.request("POST /gists", {
              description: "Gist of expression: " + spec.expression,
              public: true,
              files: {
                  [fileName]: {
                      // put State JSON Here
                      content: JSON.stringify(state, undefined, 2)
                  }
              },
              headers: {
                  "X-GitHub-Api-Version": "2022-11-28",
                  "accept": "application/vnd.github+json",
                  // "Authorization": token  
              }
          });
          const url = response.data.files[fileName].raw_url;
          setGistUrl(url);
          // copy gist link to clipboard
          navigator.clipboard.writeText(url);

          setCopied(true); 

          console.log("Gist Created:", url);
      } catch (error) {
          console.error("Error creating Gist:", error);
      }
    };

    createGist();

    // copy gist state to clipboard
    // navigator.clipboard.writeText(JSON.stringify(state, undefined, 2)); 
    // console.log("Json stringify of state", JSON.stringify(state, undefined, 2));

    // setIsModalOpen(false);
  }

  const initializeSpec = async (serverUrl: string, expression: string, fpcore?: string, specRanges?: SpecRange[]) => {    
    // Set new spec and inputRangs ids (based on previous ids of session) for imported spec
    const specId = spec.id + 1;
    const inputRangeId = nextId(inputRangesTable);

    setArchivedExpressions(expressions.map(e => e.id))

    const mathJSExpression = await ensureMathJS(expression, serverUrl); // TODO: probably unnecessary, should parse, but elsewhere

    const inputRanges = specRanges
      ? new InputRanges(specRanges, specId, inputRangeId)
      : new RangeInSpecFPCore(specId, inputRangeId);

    setInputRangesTable([...inputRangesTable, inputRanges])
    setSpec({expression: mathJSExpression, id: specId, fpcore});

    return specId;
  }

  // initialize expressions on IMPORT 
  const initializeExpressions = (oldExpressions: Expression[], oldDerivations: Derivation[], 
    newSpecId: number, oldSelectedExprId: number, oldCompareExprIds: number[], oldExpandedExpressions: number[]) => {
    
    const oldIdToNewExpressions: Map<number, Expression> = new Map();
    const newExpressions: Expression[] = [];
    const newDerivations: Derivation[] = [];
    
    // re-assign ids to expressions.
    for (let i = 0; i < oldExpressions.length; i++) {
      const expression = oldExpressions[i];          
      const newId = nextId(expressions) + i;

      const newExpression = new Expression(expression.text, newId, newSpecId, expression.tex);
      oldIdToNewExpressions.set(expression.id, newExpression);
      newExpressions.push(newExpression);
    }

    for (let i = 0; i < oldDerivations.length; i++) {
      const deriv = oldDerivations[i];
      
      const newExpression = oldIdToNewExpressions.get(deriv.id);

      const newParent = deriv.origExpId !== undefined 
              ? oldIdToNewExpressions.get(deriv.origExpId) 
              : undefined;
      const newExpressionId = newExpression?.id;
      const newParentId = newParent?.id;

      // this shouldn't happen, newId and newParentId should always exist
      if (newExpressionId === undefined) {
        continue;
      }
      newDerivations.push(new Derivation(deriv.history, newExpressionId, newParentId));
    }

    setExpressions([...oldIdToNewExpressions.values(), ...expressions]);
    setDerivations([...newDerivations, ...derivations]);

    setSelectedExprId(oldIdToNewExpressions.get(oldSelectedExprId)?.id ?? -1);
    // Shouldn't get any -1s in this result, just dealing with possible undefined from .get
    setExpandedExpressions(oldExpandedExpressions.map((id) => oldIdToNewExpressions.get(id)?.id ?? -1));
    setCompareExprIds(oldCompareExprIds.map((id) => oldIdToNewExpressions.get(id)?.id ?? -1));
  }

  const jsonToState = async (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    const jsonState = JSON.parse(importState);
    
    // TODO: Really have error handling here to make sure all fields of
    // jsonState exist as expected

    setServerUrl(jsonState.serverUrl);
    setFPTaylorServerUrl(jsonState.fptaylorServerUrl);
    setFPBenchServerUrl(jsonState.fpbenchServerUrl);

    // Sets spec and input ranges for initial table, gets back new ID for spec
    const newSpecId = await initializeSpec(jsonState.serverUrl, jsonState.spec.expression, 
      jsonState.spec.fpcore, jsonState.specRanges);

    // Initializes and sets IDs of each new expression
    initializeExpressions(jsonState.expressions, jsonState.derivations, newSpecId, 
      jsonState.selectedExprId, jsonState.compareExprIds, jsonState.expandedExpressions);

    // TODO: setting more states
    // High level vision for now: OUR history > Alice's history
    // - selected point (last one?)
    // High level vision for now: OUR history > Alice's history
    // - selected point (last one?)

    setIsModalOpen(false);
  }

  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--background-color)'
    },
  };

  const buttonStyles = {
    color: "var(--background-color)",
    fontFamily: "Ruda",
  }

  // Export page
  if (props.specPage) {
    return (
      <div className="import-export" style={{paddingBottom: "2px"}}>
        <a onClick={() => setIsModalOpen(true)} style={buttonStyles}>Import</a>
        <Modal 
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          contentLabel="State Export Modal"
          style={modalStyles}
          ariaHideApp={false}
        >
          <form onSubmit={jsonToState}>
            <label>Import analysis state: </label>
            <input type='text' placeholder={"paste state here"} value={importState} onChange={(e) => setImportState(e.target.value)} /> <br></br>
            <button type="submit">import</button>
          </form>
        </Modal>
      </div>
    );
  } else {
    return (
      <div className="import-export" style={{paddingBottom: "2px"}}>
        <a onClick={() => setIsModalOpen(true)} style={buttonStyles}>Export</a>
        <Modal 
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          contentLabel="State Export Modal"
          style={modalStyles}
          ariaHideApp={false}
        >
          <form onSubmit={stateToJson}>
            <label>Generate url with current analysis state: </label>
            <button type="submit">Generate</button>
          </form>

          {gistUrl && (
            <div style={{ marginTop: "12px" }}>
              <p><strong>Exported Gist link:</strong></p>
              <input 
                type="text" 
                value={gistUrl} 
                readOnly 
                style={{ width: "100%", padding: "6px" }} 
              />
              {copied && <p style={{ color: "green", marginTop: "6px" }}>Link copied to clipboard!</p>}
            </div>
          )}
        </Modal>
      </div>
    );
  }
}

export { SerializeStateComponent };