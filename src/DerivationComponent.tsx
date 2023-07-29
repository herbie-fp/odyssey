import React, { useState } from 'react';
import { Expression } from './HerbieTypes';
import { nextId } from './utils'
import * as herbiejs from './herbiejs'
import * as fpcore from './fpcore'
import * as types from './HerbieTypes'
import * as HerbieContext from './HerbieContext';

import './DerivationComponent.css';

const DerivationComponent = () => {
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [spec,] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [samples,] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  const sample = samples.find((sample) => sample.id === selectedSampleId)
  if (!sample) {
    // show error message on page
    return <div>Sample id {selectedSampleId} not found</div>
  }

  return (
    <div>
      <p>Derivation component here.</p>
      <button onClick={async () => {
        // get suggested expressions with Herbie and put them in the expressions table
        // TODO for now we default to the spec expression, but we will soon send this particular expression
        console.log('suggesting expression')
        const suggested = await herbiejs.suggestExpressions(fpcore.mathjsToFPCore(spec.expression), sample, serverUrl)
        console.log('suggested', suggested)

        // add the suggested expressions to the expressions table
        setExpressions([
          ...await Promise.all(suggested.alternatives.map(async (s: types.FPCore, i) =>
            new Expression(await herbiejs.fPCoreToMathJS(s, serverUrl), nextId(expressions) + i))),
          ...expressions,
        ]);
      }}>
        Herbie
      </button>
    </div>
  );
};

export { DerivationComponent };