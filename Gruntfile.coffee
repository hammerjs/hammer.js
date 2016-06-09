babel = require('rollup-plugin-babel');
module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    usebanner:
      taskName:
        options:
          position: 'top'
          banner: '
/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n
 * <%= pkg.homepage %>\n
 *\n
 * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;\n
 * Licensed under the <%= pkg.license %> license */'
          linebreak: true
        files:
          src: ['./hammer.js','./hammer.min.js']

    rollup:
      options:
        format: 'es6'
        plugins: [ babel({exclude: 'node_modules/**'}) ]
        intro: " (function(window, document, exportName, undefined) { \n'use strict';"
        outro: "})(window, document, 'Hammer');"
      files:
        dest: 'hammer.js'
        src: 'src/main.js'
        
    uglify:
      min:
        options:
          report: 'gzip'
          sourceMap: 'hammer.min.map'
        files:
          'hammer.min.js': ['hammer.js']
       # special test build that exposes everything so it's testable, now the test build is produced via rollup -c in terminal
      # the output is /tests/testBuild.js
#      test:
#        options:
#          wrap: "$H"
#          comments: 'all'
#          exportAll: true
#          mangle: false
#          beautify: true
#          compress:
#            global_defs:
#              exportName: 'Hammer'
#        files:
#          'tests/build.js': [
#            'src/utils/*.js'
#            'src/inputjs/*.js'
#            'src/input/*.js'
#            'src/touchactionjs/*.js'
#            'src/recognizerjs/*.js'
#            'src/recognizers/*.js'
#            'src/hammer.js'
#            'src/manager.js']

    'string-replace':
      version:
        files:
          'hammer.js': 'hammer.js'
        options:
          replacements: [
              pattern: '{{PKG_VERSION}}'
              replacement: '<%= pkg.version %>'
            ]

    jshint:
      options:
        jshintrc: true
      build:
        src: ['hammer.js']

    jscs:
      src: [
        'src/**/*.js' 
      ]
      options:
        config: "./.jscsrc"
        force: true

    watch:
      scripts:
        files: ['src/**/*.js']
        tasks: ['rollup','string-replace','uglify','jshint','jscs']
        options:
          interrupt: true

    connect:
      server:
        options:
          hostname: "0.0.0.0"
          port: 8000

    qunit:
      all: ['tests/unit/index.html']


  # Load tasks
  grunt.loadNpmTasks 'grunt-rollup';
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-qunit'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-string-replace'
  grunt.loadNpmTasks 'grunt-banner'
  grunt.loadNpmTasks 'grunt-jscs'

  # Default task(s)
  grunt.registerTask 'default', ['connect', 'watch']
  grunt.registerTask 'default-test', ['connect', 'uglify:test', 'watch']
  grunt.registerTask 'build', ['rollup','string-replace', 'uglify:min', 'usebanner', 'test']
  grunt.registerTask 'test', ['jshint', 'jscs','qunit']
  grunt.registerTask 'test-travis', ['build']
