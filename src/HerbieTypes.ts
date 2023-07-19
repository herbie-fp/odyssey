export class Expression {
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

export class ExpressionStyle {
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

export type ErrorAnalysisData = {
  ordinalSample: OrdinalExpressionInput[][];
  ticksByVarIdx: [string, number][][];
  splitpointsByVarIdx: never[][];
  bits: number;
  vars: string[];
  errors: ExpressionError[];
  meanBitsError: ExpressionError;
}

export class ErrorAnalysis {
  constructor(public readonly data: ErrorAnalysisData, public readonly expressionId: number, public readonly sampleId: number) { 
    this.data = data;
    this.expressionId = expressionId;
    this.sampleId = sampleId;
  }
}

export class SpecRange {
  constructor(public readonly variable: string, public readonly lowerBound: number, public readonly upperBound: number, public readonly id: number) {
    this.variable = variable;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
    this.id = id;
  }
}

export type ExpressionInputs = number[]
export type OrdinalExpressionInput = number

/**
 * the error of an expression
 */
export type ExpressionError = number
// A sample is a set of input tuples for a spec
// TODO probably don't need ExpressionError in this
export class Sample {
  constructor(
      public readonly points: [ExpressionInputs, ExpressionError][],
      public readonly specId: number,
      public readonly inputRangesId: number,
      public readonly id: number) {
    this.points = points;
    this.specId = specId;
    this.inputRangesId = inputRangesId;
    this.id = id;
  }
}

export class AverageLocalErrorAnalysis {
  constructor(public readonly expressionId: number, public readonly sampleId: number, public readonly error: ExpressionError) {
    this.expressionId = expressionId;
    this.sampleId = sampleId;
    this.error = error;
  }
}

export class PointLocalErrorAnalysis {
  constructor(public readonly expressionId: number, public readonly point: ExpressionInputs, public readonly error: ExpressionError) {
    this.expressionId = expressionId;
    this.point = point;
    this.error = error;
  }
}

export class InputRanges {
  constructor(public readonly ranges: SpecRange[], public readonly specId: number, public readonly id: number) {
    this.ranges = ranges;
    this.specId = specId;
    this.id = id;
  }
}

export class Spec {
  constructor(public readonly expression: string, public readonly ranges: SpecRange[], public readonly id: number) {
    this.expression = expression;
    // this.expressionIds = expressionIds;
    this.ranges = ranges;
    this.id = id;
  }
}