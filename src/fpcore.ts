
// const math = require('mathjs1');
// @ts-ignore
import * as math from 'mathjs1';

// TODO use these for type validation (not raw strings)
export interface mathjs extends String { }
interface fpcore extends String { }

  // eslint-disable-next-line @typescript-eslint/naming-convention
const CONSTANTS : {[key: string]: string} = { "PI": "real", "E": "real", "TRUE": "bool", "FALSE": "bool" }

const FUNCTIONS : {[key: string]: [string[], string]}= {}

"+ - * / pow copysign fdim fmin fmax fmod hypot remainder".split(" ").forEach(function (op) {
  FUNCTIONS[op] = [["real", "real"], "real"];
});
("fabs sqrt exp log sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh " +
  "cbrt ceil erf erfc exp2 expm1 floor lgamma log10 log1p log2 logb rint " +
  "round tgamma trunc").split(" ").forEach(function (op) {
    FUNCTIONS[op] = [["real"], "real"];
  });
FUNCTIONS["fma"] = [["real", "real", "real"], "real"];
"< > == != <= >=".split(" ").forEach(function (op) {
  FUNCTIONS[op] = [["real", "real"], "bool"];
});
"and or".split(" ").forEach(function (op) {
  FUNCTIONS[op] = [["bool", "bool"], "bool"];
});

// eslint-disable-next-line @typescript-eslint/naming-convention
const SECRETFUNCTIONS : {[key: string]: string} = { "^": "pow", "**": "pow", "abs": "fabs", "min": "fmin", "max": "fmax", "mod": "fmod" }

function tree_errors(tree: any, expected: string) /* tree -> list */ {
  var messages = [];
  var names = [];

  function node_processor(node: any, path?: any, parent?: any) {
    switch (node.type) {
      case "ConstantNode":
        if (["number", "boolean"].indexOf(node.valueType) === -1) {
          messages.push("Constants that are " + node.valueType + "s not supported.");
        }
        return ({ "number": "real", "boolean": "bool" })[node.valueType as string] || "real";
      case "FunctionNode":
        const name = SECRETFUNCTIONS[node.name as string] || node.name;
        if (!FUNCTIONS[name]) {
          messages.push("Function <code>" + name + "</code> unsupported.");
        } else if (FUNCTIONS[name][0].length !== node.args.length) {
          messages.push("Function <code>" + name + "</code> expects " +
            FUNCTIONS[name][0].length + " arguments");
        } else if ("" + extract(node.args) !== "" + FUNCTIONS[name][0]) {
          messages.push("Function <code>" + name + "</code>" +
            " expects arguments of type " +
            FUNCTIONS[name][0].join(", ") +
            ", got " + extract(node.args).join(", "));
        }
        return (FUNCTIONS[name] || [[], "real"])[1];
      case "OperatorNode":
        // NOTE changed from node.op reassignment to be compatible with mathjs 4.4.2
        node = { ...node, op: SECRETFUNCTIONS[node.op] || node.op }
        //node.op = SECRETFUNCTIONS[node.op] || node.op;
        if (!FUNCTIONS[node.op]) {
          messages.push("Operator <code>" + node.op + "</code> unsupported.");
        } else if (FUNCTIONS[node.op][0].length !== node.args.length &&
          !(node.op === "-" && node.args.length === 1)) {
          messages.push("Operator <code>" + node.op + "</code> expects " +
            FUNCTIONS[node.op][0].length + " arguments");
        } else if ("" + extract(node.args) !== "" + FUNCTIONS[node.op][0] &&
          !(node.op === "-" && "" + extract(node.args) === "real") &&
          !(is_comparison(node.op) /* TODO improve */)) {
          messages.push("Operator <code>" + node.op + "</code>" +
            " expects arguments of type " +
            FUNCTIONS[node.op][0].join(", ") +
            ", got " + extract(node.args).join(", "));
        }
        return (FUNCTIONS[node.op] || [[], "real"])[1];
      case "SymbolNode":
        if (!CONSTANTS[node.name]) {
          names.push(node.name);
          return "real";
        } else {
          return CONSTANTS[node.name];
        }
      case "ConditionalNode":
        if (node.condition.res !== "bool") {
          messages.push("Conditional has type " + node.condition.res + " instead of bool");
        }
        if (node.trueExpr.res !== node.falseExpr.res) {
          messages.push("Conditional branches have different types " + node.trueExpr.res + " and " + node.falseExpr.res);
        }
        return node.trueExpr.res;
      // case "ParenthesisNode":
      //   return node_processor(node.content, path, parent)
      default:
        messages.push("Unsupported syntax; found unexpected <code>" + node.type + "</code>.")
        return "real";
    }
  }

  var rtype = bottom_up(tree, node_processor).res;

  if (rtype !== expected) {
    messages.push("Expected an expression of type " + expected + ", got " + rtype);
  }

  return messages;
}

function bottom_up(tree: any, cb: any) {
  if (tree.args) {
    tree.args = tree.args.map(function (node: any) { return bottom_up(node, cb) });
  } else if (tree.condition) {
    tree.condition = bottom_up(tree.condition, cb);
    tree.trueExpr = bottom_up(tree.trueExpr, cb);
    tree.falseExpr = bottom_up(tree.falseExpr, cb);
  }
  tree.res = cb(tree);
  return tree;
}

function dump_fpcore(formula: any, ranges:any ) {  // NOTE modified get_precondition...
  var tree = math.parse(formula);

  var names: any = [];
  try {
    var body = dump_tree(tree, names);
  } catch (e: any) {
    throw new Error("Error handling formula: " + formula + "\n" + e.message);
  }
  var precondition = ranges ? FPCorePreconditionFromRanges(ranges) : null;

  var dnames = [];
  for (var i = 0; i < names.length; i++) {
    if (dnames.indexOf(names[i]) === -1) { dnames.push(names[i]); }
  }

  var name = formula.replace("\\", "\\\\").replace("\"", "\\\"");
  var fpcore = "(FPCore (" + dnames.join(" ") + ")\n  :name \"" + name + "\"";
  if (precondition) { fpcore += "\n  :pre " + precondition; }

  return fpcore + "\n  " + body + ")";
}

function is_comparison(name: string) {
  return ["==", "!=", "<", ">", "<=", ">="].indexOf(name) !== -1;
}

function extract(args: any) { return args.map(function (n: any) { return n.res }); }

function dump_tree(tree: any, names: string[]) {
  function node_processor(node: any) {
    switch (node.type) {
      case "ConstantNode":
        return "" + node.value;
      case "FunctionNode":
        // NOTE changed from node.name reassignment to be compatible with mathjs 4.4.2
        const name = SECRETFUNCTIONS[node.name] || node.name;
        if (node.args.length === 0) {
          throw new SyntaxError(`Function without arguments: ${name}. Node was: ${JSON.stringify(node)}`)
        }
        return "(" + name + " " + extract(node.args).join(" ") + ")";
      // case "ParenthesisNode":
      //   return node_processor(node.content)
      case "OperatorNode":
        // NOTE changed from node.op reassignment to be compatible with mathjs 4.4.2
        const op = SECRETFUNCTIONS[node.op] || node.op;
        if (is_comparison(op)) {
          // TODO: removed because of bugs; is this even necessary?
          // return flatten_comparisons({ ...node, op });
          return "(" + op + " " + extract(node.args).join(" ") + ")";
        } else {
          return "(" + op + " " + extract(node.args).join(" ") + ")";
        }
      case "SymbolNode":
        if (!CONSTANTS[node.name]) {
          names.push(node.name);
        }
        return node.name;
      case "ConditionalNode":
        return "(if " + node.condition.res +
          " " + node.trueExpr.res +
          " " + node.falseExpr.res + ")";
      default:
        throw SyntaxError(`Invalid tree! node:{ ${JSON.stringify(node)} }`);
    }
  }
  return bottom_up(tree, node_processor).res;
}
//@ts-ignore
window.dump_tree = dump_tree
//@ts-ignore
window.math = math

function getVarnamesMathJS(mathjs_text: mathjs) {
  const names: string[] = []
  try {
    dump_tree(math.parse(mathjs_text), names)
  } catch (e: any) {
    throw new Error(`Error getting varnames from formula: ${mathjs_text}\n${e.message}`)
  }
  var dnames = [];
  for (var i = 0; i < names.length; i++) {
    if (dnames.indexOf(names[i]) === -1) { dnames.push(names[i]); }
  }
  return dnames
}

function getVarnamesFPCore(fpcore: string) {
  return fpcore.split(/[()]/)[2].split(' ')
}

export function FPCorePreconditionFromRanges(ranges : [string, [number, number]][]) : FPCorePrecondition {  // NOTE modified get_precondition...
  // ranges should be like [["x", [-1, 1]], ["y", [0, 1000]]
  // assumes ranges was already checked for validity using eg. get_input_range_errors
  const exprs = ranges.map(([name, [start, end]]) => `(<= ${start} ${name} ${end})`).join(' ')
  return ranges.length <= 1 ? exprs : `(and ${exprs})`
}

function rangeErrors([low, high] = [undefined, undefined], empty_if_missing = false) {
  if ((low === undefined || low === '') || (high === undefined || high === '')) { return empty_if_missing ? [] : ['input still missing'] }
  const A = []
  if (!(low === undefined || low === '') && isNaN(Number(low))) {
    A.push(`The start of the range (${low}) is not a number.`)
  } else if (!Number.isFinite(Number(low))) {
    A.push(`The start of the range (${low}) is outside the floating point range.`)
  }

  if (!(high === undefined || high === '') && isNaN(Number(high))) {
    A.push(`The end of the range (${high}) is not a number.`)
  } else if (!Number.isFinite(Number(high))) {
    A.push(`The end of the range (${high}) is outside the floating point range.`)
  }

  if (Number(low) > Number(high)) { A.push(`The start of the range is higher than the end.`) }

  return A
}
function FPCoreBody(mathJSExpr: mathjs) {
  try {
    return dump_tree(math.parse(mathJSExpr), [])
  } catch (e: any) {
    throw new Error(`Error handling formula: ${mathJSExpr}\n${e.message}`)
  }
}

type FPCoreBody = string

function FPCoreGetBody(fpcore: FPCore): FPCoreBody {
  function readToken (token: any) {
    if (token === '(') {
      return {
        type: 'OPENING_PARENS'
      };
    } else if (token === ')') {
      return {
        type: 'CLOSING_PARENS'
      };
    } else if (token.match(/^\d+$/)) {
      return {
        type: 'INTEGER',
        value: parseInt(token)
      };
    } else {
      return {
        type: 'SYMBOL',
        value: token
      };
    }
  }
  
  function tokenize (expression: string) {
    return expression
      .replace(/\(/g, ' ( ')
      .replace(/\)/g, ' ) ')
      .trim()
      .split(/\s+/)
      .map(readToken);
  }
  
  function buildAST (tokens: any[]) {
    return tokens.reduce((ast, token) => {
      if (token.type === 'OPENING_PARENS') {
        ast.push([]);
      } else if (token.type === 'CLOSING_PARENS') {
        const current_expression = ast.pop();
        ast[ast.length - 1].push(current_expression);
      } else {
        const current_expression = ast.pop();
        current_expression.push(token);
        ast.push(current_expression);
      }
      return ast;
    }, [[]])[0][0];
  }
  
  function parse (expression: string) {
    return buildAST(tokenize(expression));
  }

  function astToString(ast: any) {
    return ast.value === 0 ? ast.value.toString() : ast.value?.toString() || `(${ast.map((t: any) => astToString(t)).join(' ')})`
  }

  return astToString(parse(fpcore).slice(-1)[0])
}

function parseErrors(mathJSExpr: string) {
  function mathJSErrors(mathJSExpr: string) {
    try { math.parse(mathJSExpr) } catch (e: any) { return [e.message] }
    return []
  }
  const mjserrors = mathJSErrors(mathJSExpr)
  return mjserrors.length > 0 ? mjserrors : tree_errors(math.parse(mathJSExpr), 'real')
}

// TODO deprecated, remove
export function makeFPCore ({ specMathJS, ranges, specFPCore, targetFPCoreBody = undefined, name = specMathJS }: {specMathJS: string, ranges : [string, [number, number]][], specFPCore: string, targetFPCoreBody?: string, name?: string}) {
  const vars = specFPCore === undefined ? getVarnamesMathJS(specMathJS) : getVarnamesFPCore(specFPCore)
  const target = targetFPCoreBody ? `:herbie-target ${targetFPCoreBody}\n  ` : ''
  return `(FPCore (${vars.join(' ')})\n  :name "${name}"\n  :pre ${FPCorePreconditionFromRanges(ranges)}\n  ${target}${specFPCore ? FPCoreGetBody(specFPCore) : FPCoreBody(specMathJS)})`
}

type FPCorePrecondition = string;

/**
 * Makes an FPCore string with a bunch of options.
 */
export function makeFPCore2 ({ vars, pre, body }: {vars: string[], pre: FPCorePrecondition, body: FPCoreBody }) {
  return `(FPCore (${vars.join(' ')})\n  ${ pre ? `:pre ${pre}\n` : ''}  ${body})`
}

type FPCore = string

function mathjsToFPCore(mathjs: mathjs, spec: undefined | mathjs = undefined, varnames: string[] | undefined = undefined) {
  const vars = varnames || getVarnamesMathJS(mathjs)
  return `(FPCore (${vars.join(' ')}) ${!spec ? '' : `:spec ${FPCoreBody(spec)}`} ${FPCoreBody(mathjs)})`
}

export {
  //dumpFPCore: dump_fpcore,  // Currently has no error handling!
  rangeErrors,
  FPCorePreconditionFromRanges as FPCorePrecondition,
  getVarnamesMathJS,
  getVarnamesFPCore,
  parseErrors,
  FPCoreBody,
  FPCoreGetBody,  // HACK just the fpcore version of the above, gets just the body
  mathjsToFPCore,
  SECRETFUNCTIONS,
  FUNCTIONS
}