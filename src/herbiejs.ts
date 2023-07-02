import * as fpcorejs from './fpcore';
import * as ordinalsjs from './ordinals';

interface Sample {
  points: any[];
}

interface HerbieResponse {
  error?: string;
  mathjs?: string;
  points: any[];
}

// All Herbie API calls are POSTs to /api/{endpoint}
const getHerbieApi = async (
  host: string,
  endpoint: string,
  data: object,
  retry: boolean
): Promise<HerbieResponse> => {
  const url = `${host}/api/${endpoint}`;
  // TODO add timeout?
  console.log('calling', url, 'with data', data);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    if (responseData.error) {
      throw new Error('Herbie server: ' + responseData.error);
    }
    console.log('got data', responseData);
    return responseData;
  } catch (error : any) {
    console.error('Bad call to', url, 'with data', data, 'error was', error);
    if (retry) {
      console.error('retrying once');
      return getHerbieApi(host, endpoint, data, false);
    } else {
      throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`);
    }
  }
};

export const getSample = async (
  fpcore: string,
  host: string
): Promise<HerbieResponse> => {
  return getHerbieApi(host, 'sample', { formula: fpcore, seed: 5 }, true);
};

export const suggestExpressions = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<HerbieResponse> => {
  return getHerbieApi(host, 'alternatives', { formula: fpcore, sample: sample.points, seed: 5 }, true);
};

export const analyzeLocalError = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<HerbieResponse> => {
  return getHerbieApi(host, 'localerror', { formula: fpcore, sample: sample.points, seed: 5 }, true);
};

export const analyzeExpression = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<{ pointsJson: any; meanBitsError: number }> => {
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

  const displayNumber = (v: number) => {
    const s = v.toPrecision(1)
    const [base, exponent] = s.split('e')
    if (!exponent) {
      return v.toPrecision(1) === v.toString() ? v.toPrecision(1) : v.toPrecision(6)
    }
    if (Number(exponent) <= 1 && -1 <= Number(exponent)) {
      const a = v.toString()
      const b = v.toPrecision(6)
      return a.length < b.length ? a : b
    }
    return v.toPrecision(1)
  }

  const pointsAndErrors = (await getHerbieApi(host, 'analyze', { formula: fpcore, sample: sample.points, seed: 5 }, true)).points;
  const ordinalSample = sample.points.map(p => p[0].map((v: number) => ordinalsjs.floatToApproximateOrdinal(v)));

  const vars = fpcorejs.getVarnamesFPCore(fpcore);
  const ticksByVarIdx = vars.map((v, i) => {
    const values = sample.points.map(p => p[0][i]);
    return ordinalsjs.chooseTicks(fastMin(values), fastMax(values)).map(v => [displayNumber(v), ordinalsjs.floatToApproximateOrdinal(v)]);
  });

  console.log(`ticksByVarIdx`, sample, ticksByVarIdx);

  const splitpointsByVarIdx = vars.map(v => []);  // HACK no splitpoints for now
  const errors = pointsAndErrors.map(([point, error]) => parseFloat(error));
  const meanBitsError = parseFloat((errors.reduce((sum, v) => sum + v, 0) / errors.length).toFixed(2));
  return { pointsJson: { points: ordinalSample, ticks_by_varidx: ticksByVarIdx, splitpoints_by_varidx: splitpointsByVarIdx, bits: 64, vars, error: { target: errors } }, meanBitsError };
};

export const fPCoreToMathJS = async (
  fpcore: string,
  host: string
): Promise<string | undefined> => {
  return (await getHerbieApi(host, 'mathjs', { formula: fpcore, seed: 5 }, true)).mathjs;
};