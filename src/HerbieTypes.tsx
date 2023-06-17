class Expression {
  constructor(public readonly text: string, public readonly id: number) { 
    this.text = text;
    this.id = id;
  }
}

class Analysis {
  constructor(public readonly result: string, public readonly id: number) { 
    this.result = result;
    this.id = id;
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

class Spec {
  constructor(public readonly expression: string, public readonly ranges: SpecRange[], public readonly id: number) {
    this.expression = expression;
    this.ranges = ranges;
    this.id = id;
  }
}

export { Expression, Analysis, SpecRange, Spec };