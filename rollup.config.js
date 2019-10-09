import babel from 'rollup-plugin-babel';

export default {
  input: 'src/main.js',
  output : {
    format: 'es',
    file: 'hammer.js',
    intro: " (function(window, document, exportName, undefined) { \n'use strict';",
    outro: "})(window, document, 'Hammer');"
  },
  plugins: [ babel({ exclude: 'node_modules/**' }) ],
};
