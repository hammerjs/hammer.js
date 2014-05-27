module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    meta:
      banner: '
/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n
 * <%= pkg.homepage %>\n
 *\n
 * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> <<%= pkg.author.email %>>;\n
 * Licensed under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license */\n\n'

    concat:
      build:
        src: [
          'src/hammer.prefix'
          'src/hammer.js'
          'src/utils.js'
          'src/*.js'
          'src/**/*.js'
          'src/export.js'
          'src/hammer.suffix']
        dest: 'hammer.js'

      test: # special test build that exposes everything so it's testable
        src: [
          'src/hammer.js'
          'src/*.js'
          'src/**/*.js'
          'src/export.js']
        dest: 'tests/build.js'

    uglify:
      min:
        options:
          report: 'gzip'
          sourceMap: 'hammer.min.map'
          banner: '<%= meta.banner %>'
        files:
          'hammer.min.js': ['hammer.js']

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
      src: ['src/**/*.js']
      options:
        force: true

    watch:
      scripts:
        files: ['src/**/*.js']
        tasks: ['concat','string-replace','uglify','jshint','jscs']
        options:
          interrupt: true

    connect:
      server:
        options:
          hostname: "0.0.0.0"
          port: 8000

    mocha: # disabled
      test:
        src: ['tests/unit/*.html']
        options:
          reporter: 'List'


  # Load tasks
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-mocha'
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-string-replace'
  grunt.loadNpmTasks 'grunt-jscs-checker'

  # Default task(s).
  grunt.registerTask 'default', ['connect','watch']
  grunt.registerTask 'build', ['concat','string-replace','uglify','test']
  grunt.registerTask 'test', ['jshint','jscs','concat:test']
  grunt.registerTask 'test-travis', ['build']
