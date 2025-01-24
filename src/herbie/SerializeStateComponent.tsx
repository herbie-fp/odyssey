import { useState } from 'react';
import Modal from 'react-modal';

import { Derivation, Expression, SpecRange } from './HerbieTypes';
import * as HerbieTypes from './HerbieTypes';
import * as HerbieContext from './HerbieContext';
import * as utils from './lib/utils';
import * as fpcorejs from './lib/fpcore';
import { fPCoreToMathJS } from './lib/herbiejs';
import { nextId } from './lib/utils';


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
  const [archivedExpressions, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext);
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext);
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext);

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
    const newDerivations: Derivation[] = [];
    for (const derivation of derivations) {
      if (expressions.find(e => e.id === derivation.id && e.specId === spec.id) !== undefined) {
        newDerivations.push(derivation)
      }
        // LESSON LEARNED: derivation.parentId is NOT same as spec.id
        // derivation.parentId represents the expression that the 
        // derivation belongs to
        // derivation.parentId == expression.id
        // confusing naming...
    }

    const state = {
      serverUrl,
      fptaylorServerUrl,
      fpbenchServerUrl,
      spec,
      specRanges,
      expressions: newExpressions,
      derivations: newDerivations,
    }

    console.log("export expressions", newExpressions);
    console.log("export derivations", newDerivations);

      // TODO: Revisit potential idea of storing each individual expression object
      // expression: {
      //   this.text = text;
      //   this.id = id;
      //   this.specId = specId;
      //   this.tex = tex;
      // }
      // selectedExpressions: {
      //   // array of expression
      // }
      
      // TODO: add more states
      // - All expressions
      //   - selected expression (id)
      // - selectedPoint

    navigator.clipboard.writeText(JSON.stringify(state, undefined, 2)); 

    setIsModalOpen(false);
  }

  const initializeSpec = async (serverUrl: string, expression: string, fpcore?: string, specRanges?: SpecRange[]) => {    
    // Set new spec and inputRangs ids (based on previous ids of session) for imported spec
    const specId = nextId(expressions);
    const inputRangeId = utils.nextId(inputRangesTable);

    setArchivedExpressions(expressions.map(e => e.id))

    const mathJSExpression = await ensureMathJS(expression, serverUrl); // TODO: probably unnecessary, should parse, but elsewhere

    const inputRanges = specRanges
      ? new HerbieTypes.InputRanges(specRanges, specId, inputRangeId)
      : new HerbieTypes.RangeInSpecFPCore(specId, inputRangeId);

    setInputRangesTable([...inputRangesTable, inputRanges])
    setSpec({expression: mathJSExpression, id: specId, fpcore});

    // TODO: add logging as in SpecContext.tsx

    return specId;
  }

  // initialize expressions on IMPORT 
  const initializeExpressions = (allExpressions: Expression[], allDerivations: Derivation[], newSpecId: number) => {
    
    const oldIdToNewExpressions: Map<number, Expression> = new Map();
    const newExpressions: Expression[] = [];
    const newDerivations: Derivation[] = [];
    
    // re-assign ids to expressions.
    for (let i = 0; i < allExpressions.length; i++) {
      const expression = allExpressions[i];          
      const newId = nextId(expressions) + i;

      const newExpression = new Expression(expression.text, newId, newSpecId, expression.tex);
      oldIdToNewExpressions.set(expression.id, newExpression);
      newExpressions.push(newExpression);
    }

    for (let i = 0; i < allDerivations.length; i++) {
      const deriv = allDerivations[i];
      
      const newExpression = oldIdToNewExpressions.get(deriv.id);

      const newParent = deriv.parentId !== undefined 
              ? oldIdToNewExpressions.get(deriv.parentId) 
              : undefined;
      const newExpressionId = newExpression?.id;
      const newParentId = newParent?.id;

      // this shouldn't happen, newId and newParentId should always exist
      if (newExpressionId == undefined) {
        continue;
      }
      newDerivations.push(new Derivation(deriv.derivation, newExpressionId, newParentId));
    }

      // Do we have to use .find or can we assume the HTMLHistory[] returend by Herbie
      // is mapped to the alternatives array 1:1
      // const deriv = allDerivations.find(d => d.id === expression.id);
      // const derivParent = allExpressions.find(e => e.id === deriv.parentId)
      // if(deriv !== undefined) {
      //   newDerivations.push(new Derivation(deriv.derivation, newId, derivParent));
      // }

    setExpressions([...newExpressions, ...expressions]);
    setDerivations([...newDerivations, ...derivations]);
    setCompareExprIds([...compareExprIds, ...newExpressions.map(e => e.id)]);

    console.log("import expressions", newExpressions);
    console.log("all derivations", allDerivations);
    console.log("import derivations", newDerivations);

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
    initializeExpressions(jsonState.expressions, jsonState.derivations, newSpecId);

    // TODO: setting more states
    // High level vision for now: OUR history > Alice's history

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
            <label>Copy current analysis state: </label>
            <button type="submit">Copy</button>
          </form>
        </Modal>
      </div>
    );
  }
}

export { SerializeStateComponent };