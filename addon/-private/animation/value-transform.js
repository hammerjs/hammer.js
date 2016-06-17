export const NUMBER_MATCH = /^([\-|\+])?(=)?([0-9]*\.?[0-9]*)(.*)/;

export default class ValueTransform {

  constructor(maybeNumber, canUseCalc = false) {
    let info = ValueTransform.parse(maybeNumber);

    this.canUseCalc = canUseCalc;
    this.isPositive = info.isPositive;
    this.isAdditive = info.isAdditive;
    this.amount = info.amount;
    this.unit = info.unit;
  }

  static parse(maybeNumber) {
    let numStr = (maybeNumber || 0).toString();
    let match = numStr.match(NUMBER_MATCH);

    if (!match) {
      throw new Error('Unmatchable Number');
    }

    let positive = !match[1] || match[1] === '+';

    return {
      isPositive: positive,
      isAdditive: !!match[2],
      amount: (positive ? 1 : -1) * parseFloat(match[3]).toFixed(3),
      unit: match[4] || 'px'
    };
  }

  affect(num) {
    if (!this.isAdditive) {
      return `${this.amount}${this.unit}`;
    }

    let baseline = ValueTransform.parse(num);
    if (this.unit && baseline.unit !== this.unit) {
      if (this.canUseCalc) {
        // return calc combo
        return `calc(${baseline.amount}${baseline.unit} ${this.amount}${this.unit})`;
      }

      // return non calc combo
      return `${this.amount}${this.unit}`;
    }

    // return join
    let newNum = baseline.amount + this.amount;

    return `${newNum}${this.unit}`;
  }

}
