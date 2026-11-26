'use strict';

var path = require('path');
var url = require('url');
var vm = require('vm');

// Note: Running Node/SSR/ESM load checks as a Grunt task is a bit of an odd place
// for tests, but for now this is the easiest way to test importing Hammer in a Node
// environment (CommonJS, bare VM, and native ESM) without window or document.
module.exports = function(grunt) {
    grunt.registerTask('test-ssr', 'Verify hammer.js and hammer.mjs load cleanly in Node.js without window or document', function() {
        var done = this.async();
        var pkg = grunt.config('pkg');
        var files = grunt.file.expand(grunt.config('concat.build.src'));
        var code = files.map(function(filepath) {
            return grunt.file.read(filepath);
        }).join('\n');

        // 1. CommonJS / Node.js SSR without window, document, navigator, or self
        var cjsModule = {exports: {}};
        vm.runInNewContext(code, {
            module: cjsModule,
            exports: cjsModule.exports,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        if (typeof cjsModule.exports !== 'function' || typeof cjsModule.exports.Manager !== 'function') {
            grunt.fail.fatal('SSR CommonJS load failed to export Hammer');
        }

        // 2. Bare runtime without window, document, navigator, or module
        vm.runInNewContext(code, {
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });

        // 3. Native ES module load in Node.js without window/document (when hammer.mjs is built)
        if (!grunt.file.exists('hammer.mjs')) {
            grunt.log.ok('SSR load passed (CommonJS and bare runtime without window/document).');
            done();
            return;
        }

        var esmSource = grunt.file.read('hammer.mjs');
        if (esmSource.indexOf('module.exports') !== -1 || esmSource.indexOf('define.amd') !== -1) {
            grunt.fail.fatal('hammer.mjs must not contain CommonJS or AMD UMD wrapper code');
        }

        var esmUrl = url.pathToFileURL(path.resolve('hammer.mjs')).href + '?t=' + Date.now();
        import(esmUrl).then(function(mod) {
            if (typeof mod.default !== 'function' || mod.VERSION !== pkg.version) {
                grunt.fail.fatal('SSR ESM load failed to expose default Hammer export');
            }
            Object.keys(mod.default).forEach(function(key) {
                if (mod[key] !== mod.default[key]) {
                    grunt.fail.fatal('hammer.mjs missing or mismatched named export: ' + key);
                }
            });
            grunt.log.ok('SSR load passed (CommonJS, bare runtime, and native ESM without window/document).');
            done();
        }).catch(function(err) {
            grunt.log.error(err.stack || err.message);
            done(false);
        });
    });
};
