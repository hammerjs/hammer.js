/**
 * Created by arjun on 1/5/16.
 */
import json from 'rollup-plugin-json';
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