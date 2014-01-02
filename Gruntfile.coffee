module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    # meta options
    meta:
      banner: '
/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n
 * <%= pkg.homepage %>\n
 *\n
 * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> <<%= pkg.author.email %>>;\n
 * Licensed under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license */\n\n'

    # concat src files
    concat:
      options:
        separator: '\n\n'
      dist:
        options:
          banner: '<%= meta.banner %>'
        src: [
          'src/intro.js'
          'src/core.js'
          'src/setup.js'
          'src/utils.js'
          'src/instance.js'
          'src/event.js'
          'src/pointerevent.js'
          'src/detection.js'
          'src/gestures/*.js'
          'src/outro.js']
        dest: 'hammer.js'

    # minify the sourcecode
    uglify:
      options:
        report: 'gzip'
        sourceMap: 'hammer.min.map'
        banner: '<%= meta.banner %>'
      dist:
        files:
          'hammer.min.js': ['hammer.js']

    # check for optimisations and errors
    jshint:
      options:
        curly: true
        expr: true
        newcap: true
        quotmark: 'single'
        regexdash: true
        trailing: true
        undef: true
        unused: true
        maxerr: 100
        eqnull: true
        sub: false
        browser: true
        node: true
        strict: true
        laxcomma: true
        globals:
          define: false
      dist:
        src: ['hammer.js']

    # watch for changes
    watch:
      scripts:
        files: ['src/**/*.js']
        tasks: ['concat']
        options:
          interrupt: true

    # simple node server
    connect:
      server:
        options:
          directory: "."
          hostname: "0.0.0.0"
      
    # tests
    qunit:
      all: ['tests/**/*.html']

    # saucelabs tests
    'saucelabs-qunit':
      all:
        options:
          username: 'hammerjs-ci'
          key: '2ede6d02-65b3-4ba9-aec8-44a787af0c81'
          build: process.env.TRAVIS_JOB_ID || 'dev'
          concurrency: 3

          urls: [
            'http://0.0.0.0:8000/tests/utils.html',
            'http://0.0.0.0:8000/tests/mouseevents.html',
            'http://0.0.0.0:8000/tests/mousetouchevents.html',
            'http://0.0.0.0:8000/tests/touchevents.html',
            'http://0.0.0.0:8000/tests/pointerevents_mouse.html',
            'http://0.0.0.0:8000/tests/pointerevents_touch.html'
          ]
          browsers: [
            { browserName: 'chrome' }
            { browserName: 'firefox' }
            { browserName: 'internet explorer', platform: 'Windows 7', version: '9' }
            { browserName: 'internet explorer', platform: 'Windows 8', version: '10'}
          ]


  # Load tasks
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-qunit'
  grunt.loadNpmTasks 'grunt-saucelabs'


  # Default task(s).
  grunt.registerTask 'default', ['connect','watch']
  grunt.registerTask 'build', ['concat','uglify','test']
  grunt.registerTask 'test', ['jshint','qunit']
  grunt.registerTask 'test-travis', ['build','jshint','connect','saucelabs-qunit']
