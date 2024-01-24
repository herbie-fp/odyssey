import * as contexts from './HerbieContext';

const FPTaylorComponent = () => {
  const [analyses, setAnalyses] = contexts.useGlobal(contexts.FPTaylorAnalysisContext)
  console.log(analyses)
  return (
    <div>
      <p>{analyses[0].analysis[0].bounds}</p>
      <p>{analyses[0].analysis[0].absoluteError}</p>
    </div>
  );
};

export { FPTaylorComponent };
