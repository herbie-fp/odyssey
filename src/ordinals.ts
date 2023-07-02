
const math11 = require('mathjs11');

function to_signed_int(float64: number): bigint {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, float64);
  return view.getBigInt64(0);
}

function real_from_signed_int(signed: bigint): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, signed);
  return view.getFloat64(0);
}

function mbn(x: number): any {
  return math11.bignumber(to_signed_int(x).toString());
}

const mbn_neg_0 = mbn(-0.0);

function real_to_ordinal(real: number): any {
  let signed = to_signed_int(real);
  let mbn = math11.bignumber(signed.toString());
  return signed >= 0 ? mbn : math11.subtract(mbn_neg_0, mbn);
}

function ordinal_to_real(ordinal: any): number {
  return ordinal >= 0
    ? real_from_signed_int(BigInt(ordinal))
    : real_from_signed_int(
        BigInt(math11.subtract(mbn_neg_0, math11.bignumber(ordinal)))
      );
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(x, lo));
}

function first_power10(min: number, max: number): number | false {
  let value =
    max < 0
      ? -(10 ** Math.ceil(Math.log(-max) / Math.log(10)))
      : 10 ** Math.floor(Math.log(max) / Math.log(10));
  return value <= min ? false : value;
}

function choose_between(min: number, max: number, number: number): any[] {
  let sub_range = Math.round((max - min) / (1 + number));
  let near = (x: number, n: number) =>
    x <= n && Math.abs((x - n) / sub_range) <= 0.2; // <= tolerance
  return [...Array(number)].map((_, i) => i + 1).map((itr) => {
    let power10 = first_power10(
      ordinal_to_real(clamp(max - (itr + 1) * sub_range, min, max)),
      ordinal_to_real(clamp(max - itr * sub_range, min, max))
    );
    return power10 && near(real_to_ordinal(power10), max - itr * sub_range)
      ? real_to_ordinal(power10)
      : max - itr * sub_range;
  });
}

function pick_spaced_ordinals(
  necessary: number[],
  min: number,
  max: number,
  number: number
): number[] {
  let sub_range = math11.divide(
    math11.bignumber(math11.subtract(math11.bignumber(max), math11.bignumber(min))),
    math11.bignumber(number)
  ); // size of a division on the ordinal range
  let necessary_star = (function loop(necessary: number[]): number[] {
    return necessary.length < 2
      ? necessary
      : math11.smaller(
          math11.subtract(necessary[1], necessary[0]),
          sub_range
        )
      ? loop(necessary.slice(1))
      : [necessary[0], ...loop(necessary.slice(1))];
  })(necessary); // filter out necessary points that are too close
  let all = (function loop(
    necessary: number[],
    min_star: number,
    start: number
  ): number[] {
    if (start >= number) {
      return [];
    }
    if (necessary.length === 0) {
      return choose_between(min_star, max, number - start);
    }
    let idx: number | false = false;
    for (let i = 0; i < number; i++) {
      if (
        math11.smallerEq(
          math11.subtract(
            necessary[0],
            math11.add(min, math11.bignumber(math11.multiply(i, sub_range)))
          ),
          sub_range
        )
      ) {
        idx = i;
        break;
      }
    }
    return [
      ...choose_between(min_star, necessary[0], idx as number - start),
      ...loop(necessary.slice(1), necessary[0], idx as number + 1),
    ];
  })(necessary_star, min, 0);
  return [...all, ...necessary_star].sort((a, b) =>
    math11.subtract(math11.bignumber(a), math11.bignumber(b))
  );
}

function choose_ticks(min: number, max: number): number[] {
  let tick_count = 13;
  let necessary = [min, -1.0, 0, 1.0, max].filter(
    (v) => min <= v && v <= max && min <= max
  ).map((v) => real_to_ordinal(v));
  let major_ticks = pick_spaced_ordinals(
    necessary,
    real_to_ordinal(min),
    real_to_ordinal(max),
    tick_count
  ).map((v) => ordinal_to_real(v));
  return major_ticks;
}

function float_to_approximate_ordinal(float: number): number {
  return real_to_ordinal(float).toNumber();
}

export {
  choose_ticks as chooseTicks,
  float_to_approximate_ordinal as floatToApproximateOrdinal,
  ordinal_to_real as ordinalToFloat,
};