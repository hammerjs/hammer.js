'use strict';

module.exports = function(grunt) {

    var srcCore = [
        'src/utils.js',
        'src/input.js',
        'src/input/*.js',
        'src/touchaction.js',
        'src/recognizer.js',
        'src/recognizers/*.js',
        'src/hammer.js',
        'src/manager.js',
        'src/expose.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        usebanner: {
            taskName: {
                options: {
                    position: 'top',
                    banner:
                        '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        ' * <%= pkg.homepage %>\n' +
                        ' *\n' +
                        ' * Copyright (c) <%= grunt.template.today("yyyy") %> Hammer.js contributors;\n' +
                        ' * Licensed under the <%= pkg.license %> license */',
                    linebreak: true
                },
                files: {
                    src: ['./hammer.js', './hammer.mjs']
                }
            }
        },

        concat: {
            build: {
                src: ['src/hammer.prefix.js'].concat(srcCore, ['src/hammer.suffix.js']),
                dest: 'hammer.js'
            },
            esm: {
                src: ['src/hammer.esm.prefix.js'].concat(srcCore, ['src/hammer.esm.suffix.js']),
                dest: 'hammer.mjs'
            }
        },

        uglify: {
            min: {
                options: {
                    report: 'gzip',
                    compress: {
                        arrows: false,
                        directives: false
                    },
                    output: {
                        comments: /^!/
                    },
                    sourceMap: true,
                    sourceMapName: 'hammer.min.js.map'
                },
                files: {
                    'hammer.min.js': ['hammer.js']
                }
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '127.0.0.1',
                    port: 8000
                }
            }
        }
    });

    grunt.registerTask('string-replace', 'Replace {{PKG_VERSION}} in built bundles', function() {
        var pkg = grunt.config('pkg');
        ['hammer.js', 'hammer.mjs'].forEach(function(filepath) {
            if (grunt.file.exists(filepath)) {
                var content = grunt.file.read(filepath);
                grunt.file.write(filepath, content.replace(/\{\{PKG_VERSION\}\}/g, function() {
                    return pkg.version;
                }));
            }
        });
    });

    grunt.registerTask('build-test', 'Build tests/build.js exposing internal symbols on window.$H', function() {
        var files = grunt.file.expand(srcCore);
        var body = files.map(function(filepath) {
            return grunt.file.read(filepath);
        }).join('\n');

        var names = {};
        var re = /^(?:var|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
        var match;
        while ((match = re.exec(body)) !== null) {
            names[match[1]] = true;
        }

        var exportsCode = Object.keys(names).map(function(name) {
            return 'if (typeof ' + name + ' !== \'undefined\') { $H.' + name + ' = ' + name + '; }';
        }).join('\n');

        var wrapped =
            '(function(window, document, exportName, undefined) {\n' +
            '\'use strict\';\n' +
            'var $H = window.$H = {};\n' +
            body + '\n' +
            'window[exportName] = Hammer;\n' +
            exportsCode + '\n' +
            '})(window, document, \'Hammer\');\n';

        grunt.file.write('tests/build.js', wrapped);
    });

    grunt.registerTask('qunit', 'Run QUnit unit tests in headless Chrome via Puppeteer', function() {
        var done = this.async();
        var puppeteer = require('puppeteer');
        var url = 'http://127.0.0.1:8000/tests/unit/index.html';
        var envShards = parseInt(process.env.QUNIT_SHARDS, 10);
        var shardCount = Math.min(envShards > 0 ? envShards : 4, 16);
        var startTime = Date.now();

        function runShard(browser, shardIndex) {
            return browser.newPage().then(function(page) {
                var failures = [];
                var pageErrors = [];
                var resolveDone;
                var donePromise = new Promise(function(resolve) {
                    resolveDone = resolve;
                });

                function cleanup() {
                    return page.close().catch(function() {});
                }

                return page.exposeFunction('__gruntQUnitLog', function(details) {
                    if (!details.result) {
                        failures.push(details);
                    }
                }).then(function() {
                    return page.exposeFunction('__gruntQUnitDone', function(details) {
                        resolveDone(details);
                    });
                }).then(function() {
                    return page.evaluateOnNewDocument(function(sIdx, sCnt) {
                        // Match legacy PhantomJS touch-only test environment used by Hammer Simulator
                        delete window.PointerEvent;
                        Object.defineProperty(window, 'QUnit', {
                            configurable: true,
                            set: function(val) {
                                Object.defineProperty(window, 'QUnit', {
                                    value: val,
                                    writable: true,
                                    enumerable: true,
                                    configurable: true
                                });
                                if (sCnt > 1) {
                                    var testIdx = 0;
                                    var origTest = val.test;
                                    val.test = window.test = function(name) {
                                        if (name !== 'global failure' && (testIdx++ % sCnt) !== sIdx) {
                                            return;
                                        }
                                        return origTest.apply(this, arguments);
                                    };
                                }
                                val.log(function(details) {
                                    if (!details.result) {
                                        window.__gruntQUnitLog({
                                            result: false,
                                            module: details.module,
                                            name: details.name,
                                            message: details.message,
                                            expected: String(details.expected),
                                            actual: String(details.actual)
                                        });
                                    }
                                });
                                val.done(function(details) {
                                    window.__gruntQUnitDone(details);
                                });
                            }
                        });
                    }, shardIndex, shardCount);
                }).then(function() {
                    page.on('pageerror', function(err) {
                        var msg = err && err.message ? err.message : String(err);
                        grunt.log.error('Page error: ' + msg);
                        pageErrors.push(msg);
                    });
                    return page.goto(url, {waitUntil: 'load', timeout: 30000});
                }).then(function() {
                    return page.evaluate(function() {
                        return typeof window.QUnit === 'object' && window.QUnit !== null;
                    });
                }).then(function(hasQUnit) {
                    if (!hasQUnit) {
                        throw new Error('QUnit failed to initialize.');
                    }
                    return donePromise;
                }).then(function(details) {
                    return cleanup().then(function() {
                        return {
                            details: details,
                            failures: failures,
                            pageErrors: pageErrors
                        };
                    });
                }, function(err) {
                    return cleanup().then(function() {
                        throw err;
                    });
                });
            });
        }

        puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        }).then(function(browser) {
            var shardPromises = [];
            for (var i = 0; i < shardCount; i++) {
                shardPromises.push(runShard(browser, i));
            }

            return Promise.all(shardPromises).then(function(results) {
                var passed = 0;
                var failed = 0;
                var total = 0;
                var failures = [];
                var pageErrors = 0;

                results.forEach(function(r) {
                    passed += r.details.passed;
                    failed += r.details.failed;
                    total += r.details.total;
                    failures = failures.concat(r.failures);
                    pageErrors += r.pageErrors.length;
                });

                var runtime = Date.now() - startTime;
                var shardSuffix = shardCount > 1 ? ' across ' + shardCount + ' shards' : '';

                if (failures.length) {
                    failures.forEach(function(f) {
                        grunt.log.error(
                            '[' + f.module + '] ' + f.name + ': ' +
                            (f.message || 'failed') +
                            ' (expected: ' + f.expected +
                            ', actual: ' + f.actual + ')'
                        );
                    });
                }

                var ok = failed === 0 && total > 0 && pageErrors === 0;
                if (!ok) {
                    grunt.log.error(
                        'QUnit: ' + passed + '/' + total +
                        ' assertions passed, ' + failed + ' failed, ' +
                        pageErrors + ' page error(s) (' + runtime + 'ms' + shardSuffix + ')'
                    );
                } else {
                    grunt.log.ok(
                        'QUnit: ' + passed + '/' + total +
                        ' assertions passed, 0 failed (' + runtime + 'ms' + shardSuffix + ')'
                    );
                }

                return browser.close().catch(function() {}).then(function() {
                    done(ok);
                });
            }, function(err) {
                return browser.close().catch(function() {}).then(function() {
                    throw err;
                });
            });
        }).catch(function(err) {
            grunt.log.error(err.stack || err.message);
            done(false);
        });
    });

    grunt.registerTask('lint', 'Lint source and build files with ESLint', function() {
        var done = this.async();
        var ESLint = require('eslint').ESLint;
        var eslint = new ESLint();
        var targets = ['src', 'Gruntfile.js', 'eslint.config.js'];
        if (grunt.file.exists('hammer.min.js')) {
            targets.unshift('hammer.min.js');
        }
        if (grunt.file.exists('hammer.mjs')) {
            targets.unshift('hammer.mjs');
        }
        if (grunt.file.exists('hammer.js')) {
            targets.unshift('hammer.js');
        }

        eslint.lintFiles(targets).then(function(results) {
            return eslint.loadFormatter('stylish').then(function(formatter) {
                var output = formatter.format(results);
                if (output) {
                    grunt.log.writeln(output);
                }
                var errorCount = results.reduce(function(sum, r) {
                    return sum + r.errorCount;
                }, 0);
                if (errorCount > 0) {
                    grunt.log.error('ESLint found ' + errorCount + ' error(s).');
                    done(false);
                } else {
                    grunt.log.ok('ESLint passed (' + results.length + ' files checked).');
                    done();
                }
            });
        }).catch(function(err) {
            grunt.log.error(err.stack || err.message);
            done(false);
        });
    });

    // Load Node/SSR/ESM load tests (slightly odd place to run tests via Grunt,
    // but for now the easiest way to test importing Hammer in a Node environment)
    grunt.loadTasks('tests/grunt');

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-banner');

    grunt.registerTask('default', ['connect:server:keepalive']);
    grunt.registerTask('dist', ['concat', 'string-replace', 'usebanner', 'uglify:min']);
    grunt.registerTask('build', ['dist', 'lint', 'test-ssr', 'build-test', 'connect:server', 'qunit']);
    grunt.registerTask('test', ['dist', 'lint', 'test-ssr', 'build-test', 'connect:server', 'qunit']);
    grunt.registerTask('test-travis', ['build']);
};
