'use strict';

module.exports = function(grunt) {

    var srcCore = [
        'src/utils.js',
        'src/input.js',
        'src/input/*.js',
        'src/touchaction.js',
        'src/recognizer.js',
        'src/recognizers/attribute.js',
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
        },

        qunit: {
            options: {
                puppeteer: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding'
                    ]
                }
            },
            all: {
                options: {
                    urls: ['http://127.0.0.1:8000/tests/unit/index.html']
                }
            }
        },

        eslint: {
            target: [
                'hammer.js',
                'hammer.mjs',
                'hammer.min.js',
                'src',
                'tests',
                'Gruntfile.js',
                'eslint.config.js'
            ]
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

    // Load Node/SSR/ESM load tests (slightly odd place to run tests via Grunt,
    // but for now the easiest way to test importing Hammer in a Node environment)
    grunt.loadTasks('tests/grunt');

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-banner');

    grunt.registerTask('default', ['connect:server:keepalive']);
    grunt.registerTask('dist', ['concat', 'string-replace', 'usebanner', 'uglify:min']);
    grunt.registerTask('lint', ['eslint']);
    grunt.registerTask('build', ['dist', 'lint', 'test-ssr', 'build-test', 'connect:server', 'qunit']);
    grunt.registerTask('test', ['dist', 'lint', 'test-ssr', 'build-test', 'connect:server', 'qunit']);
};
