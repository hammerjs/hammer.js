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
        // Verify hammer.min.js retains strict mode (unbound constructor call throws TypeError instead of mutating global)
        var strictThrew = false;
        try {
            var UnboundRecognizer = minModule.exports.Recognizer;
            UnboundRecognizer();
        } catch (err) {
            strictThrew = !!(err && err.name === 'TypeError');
        }
        if (!strictThrew) {
            grunt.fail.fatal('hammer.min.js must execute in strict mode');
        }
        vm.runInNewContext(minCode, {
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });

        // 2b2. Frozen window and null window/document globals load cleanly without throwing
        var frozenWin = Object.freeze({});
        var frozenMod = {exports: {}};
        vm.runInNewContext(builtCode, {
            window: frozenWin,
            module: frozenMod,
            exports: frozenMod.exports,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        if (typeof frozenMod.exports !== 'function') {
            grunt.fail.fatal('hammer.js failed to load with frozen window global');
        }
        vm.runInNewContext(builtCode, {
            window: null,
            document: null,
            navigator: null,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });

        // 2c. Web Worker runtime with `self` global (no `window`) exposes self.Hammer
        var workerSelf = {};
        vm.runInNewContext(builtCode, {
            self: workerSelf,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout
        });
        if (typeof workerSelf.Hammer !== 'function') {
            grunt.fail.fatal('hammer.js must expose Hammer on self when window is undefined (Web Worker fallback)');
        }

        // 2d. Package metadata: explicit sideEffects flag for bare imports
        if (pkg.sideEffects !== true) {
            grunt.fail.fatal('package.json must explicitly set "sideEffects": true');
        }

        // 3. Native ES module load in Node.js without window/document
        if (!grunt.file.exists('hammer.mjs')) {
            grunt.fail.fatal('hammer.mjs must be built before test-ssr');
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
                // 5. Verify hammer.mjs handles frozen window cleanly without throwing
                var frozenWindow = Object.freeze({});
                global.window = frozenWindow;
                return import(esmUrl + '&frozenWindow=1').then(function(frozenMod) {
                    if (prevWindow === undefined) {
                        delete global.window;
                    } else {
                        global.window = prevWindow;
                    }
                    if (typeof frozenMod.default !== 'function') {
                        grunt.fail.fatal('hammer.mjs failed to load with frozen window');
                    }
                    grunt.log.ok('SSR load passed (CommonJS, minified, bare runtime, frozen window, and native ESM with/without window).');
                    done();
                }, function(err) {
                    if (prevWindow === undefined) {
                        delete global.window;
                    } else {
                        global.window = prevWindow;
                    }
                    throw err;
                });
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
