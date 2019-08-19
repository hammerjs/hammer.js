import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/main.js',
  format: 'es',
  plugins: [ babel({ exclude: 'node_modules/**' }) ],
  dest: 'hammer.js',
  intro: " if(typeof window !== 'undefined' && typeof document !== 'undefined') (function(window, document, exportName, undefined) { \n'use strict';",
  outro: "})(window, document, 'Hammer');"
};
