/**
 * Created by arjun on 1/5/16.
 */
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/main.js',
    format: 'cjs',
    plugins: [ json(), babel() ],
    dest: 'bundle.js'
};