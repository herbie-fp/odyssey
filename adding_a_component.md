# Adding Component To Odyssey Documentation

## Creating the new component file
The standard naming scheme for components is as follows:

You need to create a new file called `<YourComponentName>.tsx` within the `Odyssey/src/herbie` directory. This file will contain all of the logic for the React component you're looking to add. Optionally, you can also create a `<YourComponentName>.css` file for any CSS styling your component might need.

## Identifying the parent component
Your component will almost certainly be a child component of one of the pre-existing components in the codebase. The next step here is to identify which component this is. Some common parent components are:

- `ExpressionTable.tsx`, which is the component to render the table of expressions on the right half of Odyssey, and which contains child components that have interactions with individual expressions, such as the Derivation component (which shows the derivation of a particular expression) or the Local Error component (which shows localized error for the individual parts of an expression)

## Adding a component to the ExpressionTable
If your component has the ExpressionTable as a parent component, navigate to `ExpressionTable.tsx` and find the HTML element `<div className="expressions-actual">` under the returned HTML element. Under this component, you should see the following:

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

which contains all of the components rendered as part of the Expression Table's rows. Add an import for your component at the top of the `ExpressionTable.tsx` file, and then you should be able to add your component here and have it rendered per row of the Expression Table. Make sure to pass in the expressionId, which your child component will then be able to call upon for any logic involving a particular expression.

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
