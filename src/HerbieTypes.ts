class Expression {
  /**
   *  @param {string} text - mathjs expression */
  constructor(public readonly text: string, public readonly id: number) { 
    this.text = text;
    this.id = id;
  }
}

// export class ExpressionIdsForSpec {
//   constructor(public readonly expressionIds: number[], public readonly specId: number) {
//     this.expressionIds = expressionIds;
//     this.specId = specId;
//   }
// }

class ExpressionStyle {
  // expressions have a color
  // and style object like { line: { stroke: string }, dot: { stroke: string }
  constructor(public readonly color: string,
              public readonly style: { line: { stroke: string }, dot: { stroke: string } },
              public readonly expressionId: number) {
    this.color = color;
    this.style = style;
    this.expressionId = expressionId;
  }
}

type ErrorAnalysisData = {
  ordinalSample: OrdinalExpressionInput[][];
  ticksByVarIdx: [string, number][][];
  splitpointsByVarIdx: never[][];
  bits: number;
  vars: string[];
  errors: ExpressionError[];
  meanBitsError: ExpressionError;
}

class ErrorAnalysis {
  constructor(public readonly data: ErrorAnalysisData, public readonly expressionId: number, public readonly sampleId: number) { 
    this.data = data;
    this.expressionId = expressionId;
    this.sampleId = sampleId;
  }
}

class SpecRange {
  constructor(public readonly variable: string, public readonly lowerBound: number, public readonly upperBound: number, public readonly id: number) {
    this.variable = variable;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
    this.id = id;
  }
}

type ExpressionInputs = number[]
type OrdinalExpressionInput = number
type ExpressionError = number
// A sample is a set of input tuples for a spec
class Sample {
  constructor(public readonly points: [ExpressionInputs, ExpressionError][], public readonly specId: number, public readonly id: number) {
    this.points = points;
    this.specId = specId;
    this.id = id;
  }
}

class Spec {
  constructor(public readonly expression: string, public readonly ranges: SpecRange[], public readonly id: number) {
    this.expression = expression;
    // this.expressionIds = expressionIds;
    this.ranges = ranges;
    this.id = id;
  }
}

export { Expression, ErrorAnalysis, SpecRange, Spec, Sample, ExpressionStyle, OrdinalExpressionInput, ExpressionError, ErrorAnalysisData };