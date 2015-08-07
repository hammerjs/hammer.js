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
 * Licensed under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license */'
          linebreak: true
        files:
          src: ['./hammer.js','./hammer.min.js']

    concat:
      build:
        src: [
          'src/hammer.prefix'
          'src/utils.js'
          'src/input.js'
          'src/input/*.js'
          'src/touchaction.js'
          'src/recognizer.js'
          'src/recognizers/*.js'
          'src/hammer.js'
          'src/manager.js'
          'src/expose.js'
          'src/hammer.suffix']
        dest: 'hammer.js'

    uglify:
      min:
        options:
          report: 'gzip'
          sourceMap: 'hammer.min.map'
        files:
          'hammer.min.js': ['hammer.js']
       # special test build that exposes everything so it's testable
      test:
        options:
          wrap: "$H"
          comments: 'all'
          exportAll: true
          mangle: false
          beautify: true
          compress:
            global_defs:
              exportName: 'Hammer'
        files:
          'tests/build.js': [
            'src/utils.js'
            'src/input.js'
            'src/input/*.js'
            'src/touchaction.js'
            'src/recognizer.js'
            'src/recognizers/*.js'
            'src/hammer.js'
            'src/manager.js'
            'src/expose.js']

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
        tasks: ['concat','string-replace','uglify','jshint','jscs']
        options:
          interrupt: true

    connect:
      server:
        options:
          hostname: '0.0.0.0'
          port: 8000

    qunit:
      all: ['tests/unit/index.html']

    exec:
      'meteor-init':
        command: [
          # Make sure Meteor is installed, per https://meteor.com/install.
          # The curl'ed script is safe; takes 2 minutes to read source & check.
          'type meteor >/dev/null 2>&1 || { curl https://install.meteor.com/ | sh; }',
          # Meteor expects package.js to be in the root directory
          # of the checkout, so copy it there temporarily
          'cp meteor/package.js .'
        ].join(';')
      'meteor-cleanup':
        # remove build files and package.js
        command: 'rm -rf .build.* versions.json package.js'
      'meteor-test':
        command: 'node_modules/.bin/spacejam --mongo-url mongodb:// test-packages ./'
      'meteor-publish':
        command: 'meteor publish'


  # Load tasks
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-qunit'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-string-replace'
  grunt.loadNpmTasks 'grunt-banner'
  grunt.loadNpmTasks 'grunt-jscs'
  grunt.loadNpmTasks 'grunt-exec'

  # Default task(s)
  grunt.registerTask 'default', ['connect', 'watch']
  grunt.registerTask 'default-test', ['connect', 'uglify:test', 'watch']
  grunt.registerTask 'build', ['concat', 'string-replace', 'uglify:min', 'usebanner', 'test']
  grunt.registerTask 'test', ['jshint', 'jscs', 'uglify:test', 'qunit']
  grunt.registerTask 'test-travis', ['build']

  # Meteor tasks
  grunt.registerTask 'meteor-test', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-cleanup']
  grunt.registerTask 'meteor-publish', ['exec:meteor-init', 'exec:meteor-publish', 'exec:meteor-cleanup']
  grunt.registerTask 'meteor', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-publish', 'exec:meteor-cleanup']
