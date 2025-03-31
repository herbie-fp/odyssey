export type HTMLHistory = string;

// LATER I think this should be a string? Is there a truncation risk?
export type ordinal = number
export type ordinalPoint = ordinal[]
export type FPCore = string

export class Derivation {
  /**
   * @param history: The HTMLHistory object containing the derivation (as HTML) for an alternative expression
   * @param id: The id of this derivation, the same id as the expression this derivation is for
   * @param origExpId: The id of the expression that was improved resulting in the alternative this derivation is for
   */
  constructor(public readonly history: HTMLHistory, public readonly id: number, public readonly origExpId: number | undefined) {
    this.history = history;
    this.id = id;
    this.origExpId = origExpId;
  }
}

export class Expression {
  /**
   * @param {string} text - mathjs expression 
   * @param {number} id - unique id for this expression
   * @param {number} specId - unique id of the specification this expression is associated with
   *  (could be an alternative for the spec or the naive expression, spec expression itself. in the later case
   *   ids and specIds are totally distinct)
   * @param {string} tex - the display latex for this expression
   */
  constructor(public readonly text: string, public readonly id: number, public readonly specId: number, public readonly tex: string) {
    this.text = text;
    this.id = id;
    this.specId = specId;
    this.tex = tex;
  }
}

export class ExpressionStyle {
  // expressions have a color
  // and style object like { line: { stroke: string }, dot: { stroke: string }
  constructor(public readonly color: string,
              public readonly style: { line: { stroke: string }, dot: { stroke: string, r?: number } },
              public readonly expressionId: number) {
    this.color = color;
    this.style = style;
    this.expressionId = expressionId;
  }
}

export type ErrorAnalysisData = {
  ordinalSample: ordinal[][];
  ticksByVarIdx: [string, number][][];
  splitpointsByVarIdx: never[][];
  bits: number;
  vars: string[];
  errors: expressionError[];
  meanBitsError: expressionError;
}

export class ErrorAnalysis {
  constructor(public readonly data: ErrorAnalysisData, public readonly expressionId: number, public readonly sampleId: number) {
    this.data = data;
    this.expressionId = expressionId;
    this.sampleId = sampleId;
  }
}

export class CostAnalysis {
  constructor(public readonly expressionId: number, public readonly cost: number) {
    this.expressionId = expressionId;
    this.cost = cost;
  }
}

export class SelectedSubset {
  constructor(public readonly selection: number[], public readonly varIdx: number, public readonly points: ordinal[][]) {
    this.selection = selection;
    this.varIdx = varIdx;
    this.points = points;
  }
}

export type SubsetErrorAnalysis = {expressionId: number, subsetErrorResult: string};

export class SpecRange {
  constructor(public readonly variable: string, public readonly lowerBound: number, public readonly upperBound: number) {
    this.variable = variable;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
  }
}

export class GPU_FPXExpression {
  constructor(public readonly cudaExpression: string) {
    this.cudaExpression = cudaExpression;
  }
}

/**
 * the error of an expression
 */
export type expressionError = number
// A sample is a set of input tuples for a spec
// LATER probably don't need ExpressionError in this
export class Sample {
  constructor(
      public readonly points: [ordinalPoint, expressionError][],
      public readonly specId: number,
      public readonly inputRangesId: number,
      public readonly id: number) {
    this.points = points;
    this.specId = specId;
    this.inputRangesId = inputRangesId;
    this.id = id;
  }
}

export interface LocalErrorTree {
  /** the expression */
  e: string
  children: LocalErrorTree[]
  'ulps-error': string
  'avg-error': string
  'exact-value': string
  'actual-value': string
  'abs-error-difference': string
  'percent-accuracy': string
}

export class AverageLocalErrorAnalysis {
  constructor(public readonly expressionId: number, public readonly sampleId: number, public readonly errorTree: LocalErrorTree) {
    this.expressionId = expressionId;
    this.sampleId = sampleId;
    this.errorTree = errorTree;
  }
}

export class PointLocalErrorAnalysis {
  constructor(public readonly expressionId: number, public readonly point: ordinalPoint, public readonly error: LocalErrorTree) {
    this.expressionId = expressionId;
    this.point = point;
    this.error = error;
  }
}

type Explanation = [
  string,  // operator
  string,  // expression
  string,  // type
  number,  // occurrences
  number,  // errors
  any[] ,   // details
  Array<Array<number>>
];

export interface ErrorExpressionResponse {
  explanation: Explanation[];
}

export class PointErrorExpAnalysis {
  constructor(public readonly expressionId: number, public readonly point: ordinalPoint, public readonly error:ErrorExpressionResponse) {
    this.expressionId = expressionId;
    this.point = point;
    this.error = error;
  }
}

export class FPTaylorAnalysis {
  constructor(public readonly expressionId: number, public readonly analysis: any) {
    this.expressionId = expressionId;
    this.analysis = analysis;
  }
}

export class FPTaylorRange {
  constructor(public readonly expressionId: number, public readonly ranges: SpecRange[]) {
    this.expressionId = expressionId;
    this.ranges = ranges;
  }
}

export class InputRanges {
  constructor(public readonly ranges: SpecRange[], public readonly specId: number, public readonly id: number) {
    this.ranges = ranges;
    this.specId = specId;
    this.id = id;
  }
}

export class RangeInSpecFPCore {
  constructor(public readonly specId: number, public readonly id: number) {
    this.specId = specId;
    this.id = id;
  }
}

export class Spec {
  constructor(public readonly expression: string, public readonly id: number, public readonly fpcore?: string | undefined) {
    this.expression = expression;
    // this.expressionIds = expressionIds;
    // this.ranges = ranges;
    this.id = id;
    this.fpcore = fpcore;
  }
}

// What alternatives call returns to us
/* JobResponse {
//   jobId: ...
  }

/* HerbieJobResponse extends JobResponse {
//   jobId: ...
//   herbieJobId: ...
//   commitHash: ...
//   path: ...
*/

 // What we feed into the alternatives call
// JobInfo {
//   expressionId: ...
//   jobId: ...
//   jobType: 'alternatives'
//   }

// ^ ^ ^
// | | |
// save for later

// AlternativesJobResponse extends HerbieJobResponse {
//   expressionId: ...  // HACK use this instead for now
//   path: ...
//   

export class AlternativesJobResponse {
  constructor(public readonly expressionId: number[], public readonly path: string) {
    this.expressionId = expressionId;
    this.path = path;
  }
}
