'use strict';

var browserGlobals = {
    window: 'readonly',
    self: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    HTMLElement: 'readonly',
    Element: 'readonly',
    Node: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    MouseEvent: 'readonly',
    TouchEvent: 'readonly',
    PointerEvent: 'readonly',
    MSPointerEvent: 'readonly',
    DocumentTouch: 'readonly',
    define: 'readonly',
    module: 'readonly',
    exports: 'readonly'
};

var nodeGlobals = {
    module: 'readonly',
    exports: 'readonly',
    require: 'readonly',
    process: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    console: 'readonly',
    Buffer: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly'
};

var commonRules = {
    'curly': ['error', 'all'],
    'camelcase': ['error', {properties: 'never'}],
    'new-cap': ['error', {capIsNew: false}],
    'no-cond-assign': ['error', 'except-parens'],
    'no-constant-condition': 'error',
    'no-debugger': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': ['error', {allowEmptyCatch: true}],
    'no-ex-assign': 'error',
    'no-extend-native': 'error',
    'no-func-assign': 'error',
    'no-irregular-whitespace': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-multi-str': 'error',
    'no-obj-calls': 'error',
    'no-redeclare': 'error',
    'no-sparse-arrays': 'error',
    'no-trailing-spaces': 'error',
    'no-unreachable': 'error',
    'no-unsafe-negation': 'error',
    'quotes': ['error', 'single', {avoidEscape: true}],
    'semi': ['error', 'always'],
    'use-isnan': 'error',
    'valid-typeof': 'error'
};

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'hammer.min.js',
            'src/hammer.prefix.js',
            'src/hammer.suffix.js',
            'src/hammer.esm.prefix.js',
            'src/hammer.esm.suffix.js',
            'tests/**'
        ]
    },
    {
        files: ['hammer.js'],
        languageOptions: {
            ecmaVersion: 5,
            sourceType: 'script',
            globals: browserGlobals
        },
        rules: Object.assign({}, commonRules, {
            'no-undef': 'error',
            'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none'}],
            'strict': ['error', 'function']
        })
    },
    {
        files: ['hammer.mjs'],
        languageOptions: {
            ecmaVersion: 2015,
            sourceType: 'module',
            globals: browserGlobals
        },
        rules: Object.assign({}, commonRules, {
            'no-undef': 'error',
            'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none'}]
        })
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 5,
            sourceType: 'script'
        },
        rules: Object.assign({}, commonRules, {
            'eol-last': ['error', 'always']
        })
    },
    {
        files: ['Gruntfile.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: Object.assign({}, nodeGlobals, {
                window: 'readonly'
            })
        },
        rules: Object.assign({}, commonRules, {
            'eol-last': ['error', 'always'],
            'no-undef': 'error',
            'no-unused-vars': ['error', {args: 'after-used', caughtErrors: 'none'}],
            'strict': ['error', 'safe']
        })
    }
];
