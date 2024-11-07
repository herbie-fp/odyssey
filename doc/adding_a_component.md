# Adding a component to Odyssey

The purpose of this documentation is to explain how to add a component to Odyssey's interface.

This documentation assumes that you have the repo set up locally, that you have installed all necessary dependencies, and that you can compile, build, and then run Odyssey on your local machine.

The codebase makes heavy use of [React](https://react.dev/), which you should be familiar with before constructing a component. There exist tutorials [for more modern React](https://react.dev/learn) as well as [this older React tutorial](https://legacy.reactjs.org/tutorial/tutorial.html).

TypeScript is the language of choice for this codebase. It features a fairly powerful [type system](https://www.typescriptlang.org/docs/handbook/intro.html) that you should be familiar with.

## Creating a branch

To avoid breaking functionality on the main branch, you should [develop on a separate branch](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging), ideally named something descriptive related to the functionality you're implementing (the name of your component is a good choice for this).

## Creating the new component file

The standard naming scheme for components is as follows:

You need to create a new file called `<YourComponentName>.tsx` within the `Odyssey/src/herbie` directory. This file will contain all of the logic for the React component you're looking to add. Optionally, you can also create a `<YourComponentName>.css` file for any CSS styling your component might need.

## A basic template

The following is a basic template for a skeleton React component (this will go in your tsx file you just created):

```
// External imports (libraries, etc.) will go here
import React from 'react';

import * as contexts from './HerbieContext';
import './YourComponent.css'; // If you have a CSS file associated with the component
// Other local imports (Herbie types, Contexts, etc) will go here

// If you have any external parameters that should be passed in to the component
// (these will be any props passed in from the parent component, and follow
// standard TypeScript type annotations (https://www.tutorialsteacher.com/typescript/type-annotation)
// this should be defined in the next line to be passed into the function.
const YourComponent = ({ yourProp }: { yourProp: typeOfYourProp }) => {
  // Set up your global contexts at the beginning
  // If you need any global Odyssey state, this will come in the form of Contexts
  // (more on that later in the Contexts section)
  // Using contexts will look something like this:
  // const [someContext, setSomeContext] = contexts.useGlobal(contexts.SomeContext)

  // Functions for logic relating to the component go here
  function someFunction() {
    // do something here
  }

  const otherFunction = (parameter: number) => {
    // do something else here
  }

  return (
    <div>
      <p>Your component's child components will go here.</p>
    </div>
  );
};

export { YourComponent };
```

## Identifying the parent component

Your component will almost certainly be a child component of one of the pre-existing components in the codebase. The next step here is to identify which component this is. Some common parent components are:

- `ExpressionTable.tsx`, which is the component to render the table of expressions on the right half of Odyssey, and which contains child components that have interactions with individual expressions, such as the Derivation component (which shows the derivation of a particular expression) or the Local Error component (which shows localized error for the individual parts of an expression)
- Left-side global `SelectableVisualization.tsx`, which is the component to render the various visualizations on the left half of Odyssey, and which contains a drop-down menu from which the user can choose multiple different visualizations.

It is possible for the same component to be reused in multiple locations, and thus have multiple parent components - in that case, it should be added in each location where the component should appear. This also makes it very flexible to modify the location of the component.

## Adding a component to the ExpressionTable

If your component has the ExpressionTable as a parent component, navigate to `ExpressionTable.tsx` and find the HTML element `<div className="expressions-actual">` under the returned HTML element. Under this component, you should see something like the following (as of October 2024):

```
const components = [
  { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expression.id} /> },
  { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={expression.id}/> },
  { value: 'fpTaylorComponent', label: 'FPTaylor Analysis', component: <FPTaylorComponent expressionId={expression.id}/> },
  { value: 'expressionExport', label: 'Expression Export', component: <ExpressionExport expressionId={expression.id}/> },
  { value: 'errorExplanation', label: 'Error Explanation', component: <ErrorExplanation expressionId={expression.id}/> },
  { value: 'linkToReports', label: 'Link To Reports', component: <LinkToReports expressionId={expression.id} />}
];
```

which contains all of the components rendered as part of the Expression Table's rows. Add an import for your component at the top of the `ExpressionTable.tsx` file, and then you should be able to add your component here and have it rendered per row of the Expression Table. Make sure to pass in the expressionId, which your child component will then be able to call upon for any logic involving a particular expression, and include this as an [prop](https://legacy.reactjs.org/docs/components-and-props.html) that can be passed in in your component.

**Importantly**, note that the ExpressionTable will then pass all of these components into a SelectableVisualization component (not to be confused with the left-side SelectableVisualization) - this component corresponds to the individual dropdowns available for each expression on the **right half** of Odyssey, not the single selectable visualization on the left half of Odyssey.

## Adding a component to the Left-Side SelectableVisualization

If your component has the left-side SelectableVisualization as a parent component, navigate to `HerbieUI.tsx` and find the HTML element <SelectableVisualization>. The element in question should have a `components`, defined in the same file as something like (as of October 2024):

```
const components = [
  { value: 'errorPlot', label: 'Error Plot', component: <ErrorPlot /> },
  { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={selectedExprId} /> },
  { value: 'SpeedVersusAccuracy', label: 'Speed Versus Accuracy Pareto', component: <SpeedVersusAccuracyPareto />},
];
```

which contains all of the components rendered as part of the Selectable Visualization. Add an import for your component at the top of the `HerbieUI.tsx` file, and then you should be able to add your component here and have it rendered as an option in the Selectable Visualization.

## Global state and contexts

You may find that your component requires access to some of the global state shared across all of Odyssey. This state is almost always contained within a [Context](https://react.dev/learn/passing-data-deeply-with-context) from `HerbieContext.ts`.

To use these Contexts, simply add

```
import * as contexts from './HerbieContext';
```

to your component, which will then allow you to work with React hooks for any context as follows:

```
const [sampleContext, setSampleContext] = contexts.useGlobal(contexts.SampleContext)
```

which will then allow you to work with that state like any other React state.

If you need to create a new Context, navigate to `HerbieContext.ts` and export a new const Context as follows:

```
export const YourNewContext = makeGlobal('Your context state here')
```

## Creating custom types

You might also find yourself needing custom types to package data cleanly - these should be defined and set up in `HerbieTypes.ts`.

These work the same way as standard TypeScript [types](https://www.typescriptlang.org/docs/handbook/2/objects.html).
