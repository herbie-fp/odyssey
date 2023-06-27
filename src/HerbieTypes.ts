class Expression {
  /**
   *  @param {string} text - mathjs expression */
  constructor(public readonly text: string, public readonly id: number) { 
    this.text = text;
    this.id = id;
  }
}

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

class ErrorAnalysis {
  constructor(public readonly data: [[number, number], number][], public readonly expressionId: number) { 
    this.data = data;
    this.expressionId = expressionId;
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

// A sample is a set of input tuples for a spec
class Sample {
  constructor(public readonly points: number[][], public readonly id: number) {
    this.points = points;
    this.id = id;
  }
}

class Spec {
  constructor(public readonly expression: string, public readonly ranges: SpecRange[], public readonly id: number) {
    this.expression = expression;
    this.ranges = ranges;
    this.id = id;
  }
}

export { Expression, ErrorAnalysis, SpecRange, Spec, Sample, ExpressionStyle };