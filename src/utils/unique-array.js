import inArray from './in-array';

/**
 * @private
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */
export default function uniqueArray(src, key, sort) {
  let results = [];
  let values = [];
  let i = 0;

  while (i < src.length) {
    let val = key ? src[i][key] : src[i];
    if (inArray(values, val) < 0) {
      results.push(src[i]);
    }
    values[i] = val;
    i++;
  }

  if (sort) {
    if (!key) {
      results = results.sort();
    } else {
      results = results.sort((a, b) => {
        return a[key] > b[key];
      });
    }
  }

  return results;
}
