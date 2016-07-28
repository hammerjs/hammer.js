const babel = require('rollup-plugin-babel');

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    usebanner: {
      taskName: {
        options: {
          position: 'top',
          banner: `/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>
                    * <%= pkg.homepage %>
                    *
                    * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;
                    * Licensed under the <%= pkg.license %> license */`.replace(/  +/g, ''),
          linebreak: true
        },
        files: {
          src: ['./hammer.js', './hammer.min.js']
        }
      }
    },
    rollup: {
      options: {
        format: 'es6',
        plugins: [
          babel({
            exclude: 'node_modules/**'
          })
        ],
        intro: '(function(window, document, exportName, undefined) {\n \'use strict\';',
        outro: '})(window, document, \'Hammer\');'
      },
      files: {
        dest: 'hammer.js',
        src: 'src/main.js'
      }
    },
    uglify: {
      min: {
        options: {
          report: 'gzip',
          sourceMap: 'hammer.min.map'
        },
        files: {
          'hammer.min.js': ['hammer.js']
        }
      }
    },
    'string-replace': {
      version: {
        files: {
          'hammer.js': 'hammer.js'
        },
        options: {
          replacements: [
            {
              pattern: '{{PKG_VERSION}}',
              replacement: '<%= pkg.version %>'
            }
          ]
        }
      }
    },
    jshint: {
      options: {
        jshintrc: true
      },
      build: {
        src: ['src/**/*.js','hammer.js','tests/unit/*.js','tests/unit/gestures/*.js','Gruntfile.js']
      }
    },
    jscs: {
      src: ['src/**/*.js','tests/unit/*.js','tests/unit/gestures/*.js','Gruntfile.js'],
      options: {
        config: './.jscsrc',
        force: true
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*.js','tests/unit/*.js','tests/unit/gestures/*.js'],
        tasks: ['rollup', 'string-replace', 'uglify', 'jshint', 'jscs'],
        options: {
          interrupt: true
        }
      }
    },
    connect: {
      server: {
        options: {
          hostname: '0.0.0.0',
          port: 8000
        }
      }
    },
    qunit: {
      all: ['tests/unit/index.html']
    }
  });
  grunt.loadNpmTasks('grunt-rollup');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-banner');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.registerTask('default', ['connect', 'watch']);
  grunt.registerTask('default-test', ['connect', 'uglify:test', 'watch']);
  grunt.registerTask('build', ['rollup', 'string-replace', 'uglify:min', 'usebanner', 'test']);
  grunt.registerTask('test', ['jshint', 'jscs', 'qunit']);
  grunt.registerTask('test-travis', ['build']);
};
