/**
 * Created by arjun on 28/05/16.
 */

import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/testMain.js',
    format: 'es6',
    // moduleName: 'HAMMER',
    plugins: [ babel({exclude: 'node_modules/**'}) ],
    dest: 'tests/testBuild.js',
    intro: " (function(window, document, exportName, undefined) { \n'use strict' ",
    outro: "})(window, document, 'Hammer');"

};