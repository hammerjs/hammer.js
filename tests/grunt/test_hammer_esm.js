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
        // 1. CommonJS / Node.js SSR without window, document, navigator, or self (using built hammer.js)
        var builtCode = grunt.file.read('hammer.js');
        var cjsModule = {exports: {}};
        vm.runInNewContext(builtCode, {
            module: cjsModule,
            exports: cjsModule.exports,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        if (typeof cjsModule.exports !== 'function' || typeof cjsModule.exports.Manager !== 'function' ||
            cjsModule.exports.VERSION !== pkg.version) {
            grunt.fail.fatal('SSR CommonJS load failed to export Hammer with version ' + pkg.version + ' (got ' + cjsModule.exports.VERSION + ')');
        }

        // 2. Bare runtime without window, document, navigator, or module
        vm.runInNewContext(builtCode, {
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });

        // 2b. Minified hammer.min.js loads cleanly in Node SSR (CommonJS + bare) with pkg.version
        if (!grunt.file.exists('hammer.min.js')) {
            grunt.fail.fatal('hammer.min.js must be built before test-ssr');
        }
        var minCode = grunt.file.read('hammer.min.js');
        var minModule = {exports: {}};
        vm.runInNewContext(minCode, {
            module: minModule,
            exports: minModule.exports,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        if (typeof minModule.exports !== 'function' || minModule.exports.VERSION !== pkg.version) {
            grunt.fail.fatal('SSR CommonJS load of hammer.min.js failed');
        }
        vm.runInNewContext(minCode, {
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

            // 4. Verify hammer.mjs assigns window.Hammer when window is defined
            var fakeWindow = {};
            var prevWindow = global.window;
            global.window = fakeWindow;
            return import(esmUrl + '&withWindow=1').then(function(winMod) {
                if (prevWindow === undefined) {
                    delete global.window;
                } else {
                    global.window = prevWindow;
                }
                if (fakeWindow.Hammer !== winMod.default) {
                    grunt.fail.fatal('hammer.mjs failed to assign window.Hammer when window is defined');
                }
                grunt.log.ok('SSR load passed (CommonJS, minified, bare runtime, and native ESM with/without window).');
                done();
            }, function(err) {
                if (prevWindow === undefined) {
                    delete global.window;
                } else {
                    global.window = prevWindow;
                }
                throw err;
            });
        }).catch(function(err) {
            grunt.log.error(err.stack || err.message);
            done(false);
        });
    });
};
