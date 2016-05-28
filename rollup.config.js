/**
 * Created by arjun on 28/05/16.
 */

import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/main.js',
    format: 'es6',
    // moduleName: 'HAMMER',
    plugins: [ babel({exclude: 'node_modules/**'}) ],
    dest: 'bundle.js',
    intro: " (function(window, document, exportName, undefined) { \n'use strict' ",
    outro: "})(window, document, 'Hammer');"

};