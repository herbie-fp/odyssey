import * as fpcorejs from './fpcore';
import * as ordinalsjs from './ordinals';
import { ErrorExpressionResponse, Sample } from '../HerbieTypes';
import * as types from '../HerbieTypes';
import { getApi } from './servercalls';

interface HerbieResponse {
  error?: string;
  mathjs?: string;
  points: any[];
  tree?: types.LocalErrorTree;
}

const getHerbieApiAsync = async (
  host: string,
  endpoint: string,
  data: object,
  retry: boolean
): Promise<any> => {
  const url = `${host}/api/start/${endpoint}`;
  console.debug('calling', url, 'async with data', data);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    const job_id = responseData.job
    let counter = 0
    let cap = 100
    if (responseData.error) {
      throw new Error('Herbie server: ' + responseData.error);
    }
    console.debug('Job started: ', job_id);
    const statusURL = `${host}/check-status/${job_id}`
    var checkResponse = await fetch(statusURL, {
      method: 'GET',
    });
    while (checkResponse.status != 201 && counter < cap) {
      counter += 1
      checkResponse = await fetch(`${host}/check-status/${job_id}`, {
        method: 'GET',
      });
      await new Promise(r => setTimeout(r, 100)); // ms
    }
    // Guard that the job is finished. If not throw an error giving up on this request.
    if (checkResponse.status != 201) {
      throw new Error(`Request timeout`)
    }
    const result = await fetch(`${host}/api/result/${job_id}`, {
      method: 'GET',
    });
    return await result.json()
  } catch (error: any) {
    throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`)
  }
};

// All Herbie API calls are POSTs to /api/{endpoint}
const getHerbieApi = async (
  host: string,
  endpoint: string,
  data: object,
  retry: boolean
): Promise<any> => {
  const asyncEndpoints = [
    "improve",
    "sample",
    "explanations",
    "analyze",
    "exacts",
    "calculate",
    "localerror",
    "alternatives",
    "cost"
  ]
  // If async API available use that instead.
  if (asyncEndpoints.includes(endpoint)) {
    return getHerbieApiAsync(host, endpoint, data, retry);
  }

  const url = `${host}/api/${endpoint}`;
  // LATER add timeout?
  console.debug('calling', url, 'with data', data);
  try {
    const responseData = await getApi(url,data,false);
    if (responseData.error) {
      throw new Error('Herbie server: ' + responseData.error);
    }
    console.debug('got data', responseData);
    return responseData;
  } catch (error: any) {
    throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`)
    // old retry code
    // console.error('Bad call to', url, 'with data', data, 'error was', error);
    // if (retry) {
    //   console.error('retrying once');
    //   return getHerbieApi(host, endpoint, data, false);
    // } else {
    //   throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`);
    // }
  }
};

export const getSample = async (
  fpcore: string,
  host: string
): Promise<HerbieResponse> => {
  return getHerbieApi(host, 'sample', { formula: fpcore, seed: 5 }, true);
};

export type FPCore = string;
export type HTMLHistory = string;
type ordinal = number;

/** 
 * The response containing alternatives from Herbie.
 * Each alternative will have a history (derivation) and
 * splitpoints that correspond to the alternatives array
 * (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1])
**/
interface HerbieAlternativesResponse {
  alternatives: FPCore[];

  /** The history of each alternative. (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1]) */
  histories: HTMLHistory[];

  /** The splitpoints for each alternative. (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1]) */
  splitpoints: ordinal[][];

  //job id for the request
  job: string;

  // //path of the request
  path: string;
}

export const suggestExpressions = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<HerbieAlternativesResponse> => {
  return getHerbieApi(host, 'alternatives', { formula: fpcore, sample: sample.points, seed: 5 }, true);
};

interface LocalErrorResponse {
  tree: types.LocalErrorTree;
}

interface CostResponse {
  cost: number;
}

export const analyzeLocalError = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<types.LocalErrorTree> => {
  return (await getHerbieApi(host, 'localerror', { formula: fpcore, sample: sample.points, seed: 5 }, true) as LocalErrorResponse).tree;
};


export interface ExpressionExportResponse {
  language: string;
  result: string;
}

export const analyzeExpressionExport = async (
  fpcore: string,
  language: string,
  host: string
): Promise<ExpressionExportResponse> => {
  return (await getHerbieApi(host, 'translate', { formula: fpcore, language: language }, true));
};


export const analyzeErrorExpression = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<ErrorExpressionResponse> => {
  return (await getHerbieApi(host, 'explanations', { formula: fpcore, sample: sample.points, seed: 5 }, true));
};


export const getCost = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<number> => {
  return (await getHerbieApi(host, 'cost', { formula: fpcore, sample: sample.points }, true) as CostResponse).cost;
};

type point = ordinal[]
type error = string

interface AnalyzeResponse {
  points: [point, error][];
}

export const analyzeExpression = async (
  fpcore: string,
  sample: Sample,
  host: string
) => {
  function fastMin(arr: number[]) {
    var len = arr.length, min = Infinity;
    while (len--) {
      if (arr[len] < min) {
        min = arr[len];
      }
    }
    return min;
  };

  function fastMax(arr: number[]) {
    var len = arr.length, max = -Infinity;
    while (len--) {
      if (arr[len] > max) {
        max = arr[len];
      }
    }
    return max;
  };



  const pointsAndErrors = ((await getHerbieApi(host, 'analyze', { formula: fpcore, sample: sample.points, seed: 5 }, true)) as AnalyzeResponse).points;
  const ordinalSample = pointsAndErrors.map(p => p[0].map((v: number) => ordinalsjs.floatToApproximateOrdinal(v)));

  // console.log('first 10 pointsAndErrors', pointsAndErrors.map(([point, error]) => point).slice(0, 10));
  // console.log('first 10 sample points', sample.points.map(p => p[0]).slice(0, 10));
  // console.log('first 10 pointsAndErrors points (from /analyze) after sorting', pointsAndErrors.map(([point, error]) => point).sort().slice(0, 10));
  // console.log('first 10 sample points (from /sample) after sorting', sample.points.map(p => p[0]).sort().slice(0, 10));

  const vars = fpcorejs.getVarnamesFPCore(fpcore);
  const ticksByVarIdx: [string, number][][] = vars.map((v, i) => {
    const values = sample.points.map(p => p[0][i]);
    return ordinalsjs.chooseTicks(fastMin(values), fastMax(values)).map(v => [displayNumber(v), ordinalsjs.floatToApproximateOrdinal(v)]);
  });

  // console.debug(`ticksByVarIdx`, sample, ticksByVarIdx);

  const splitpointsByVarIdx = vars.map(v => []);  // HACK no splitpoints for now
  const errors = pointsAndErrors.map(([point, error]) => parseFloat(error));
  const meanBitsError = parseFloat((errors.reduce((sum, v) => sum + v, 0) / errors.length).toFixed(2));
  return {
    ordinalSample,
    ticksByVarIdx,
    splitpointsByVarIdx,
    bits: 64,
    vars,
    errors,
    meanBitsError
    // pointsJson: { points: ordinalSample, ticks_by_varidx: ticksByVarIdx, splitpoints_by_varidx: splitpointsByVarIdx, bits: 64, vars, error: { target: errors } }, meanBitsError
  };
};

export const displayNumber = (v: number) => {
  const s = v.toPrecision(1)
  const [base, exponent] = s.split('e')
  const digits = 4

  if (!exponent) {
    const result = v.toPrecision(1) === v.toString() ? v.toPrecision(1) 
      : parseFloat(v.toFixed(digits)) + ""
    return result
  }

  if (Number(exponent) <= 1 && -1 <= Number(exponent)) {
    const a = v.toString()
    const b = v.toPrecision(digits)
    return a.length < b.length ? a : b
  }
  
  const result = v.toPrecision(1)
  return result.startsWith('1e') ? result.slice(1) : result
}

export const fPCoreToMathJS = async (
  fpcore: string,
  host: string
): Promise<string> => {
  return (await getHerbieApi(host, 'mathjs', { formula: fpcore, seed: 5 }, true)).mathjs;
};