module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    # meta options
    meta:
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n ' + '<%= pkg.homepage ? "* " + pkg.homepage + "\\n *\\n " : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> <<%= pkg.author.email %>>;\n' +
      ' * Licensed under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license */\n\n'

    # concat src files
    concat:
      options:
        separator: '\n\n'
      dev:
        options:
          banner: '<%= meta.banner %>'
        src: [
          'src/intro.js'
          'src/core.js'
          'src/setup.js'
          'src/instance.js'
          'src/event.js'
          'src/pointerevent.js'
          'src/utils.js'
          'src/gesture.js'
          'src/gestures.js'
          'src/outro.js']
        dest: 'dist/dev/hammer.js'
      devjquery:
        src: [
          'dist/dev/hammer.js'
          'plugins/jquery.hammer.js']
        dest: 'dist/dev/jquery.hammer.js'

    # minify the sourcecode
    uglify:
      release:
        options:
          banner: '<%= meta.banner %>'
        files:
          'dist/stable/<%= pkg.version %>/hammer.min.js': ['dist/dev/hammer.js']
          'dist/stable/<%= pkg.version %>/jquery.hammer.min.js': ['dist/dev/jquery.hammer.js']

    # copy src to latest version
    copy:
      hammer:
        src: ['dist/dev/hammer.js']
        dest: 'dist/stable/<%= pkg.version %>/hammer.js'
      jquery:
        src: ['dist/dev/jquery.hammer.js']
        dest: 'dist/stable/<%= pkg.version %>/jquery.hammer.js'
      latest:
        src: ['dist/stable/<%= pkg.version %>/*.js'],
        dest: 'dist/stable/latest/'
        expand: true
        flatten: true



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
      build:
        src: ['dist/<%= pkg.name %>-<%= pkg.version %>.js']


    # watch for changes
    watch:
      scripts:
        files: 'src/*.js'
        tasks: ['concat']
        options:
          interrupt: true

    # simple node server
    connect:
      server:
        options:
          hostname: "0.0.0.0"

    # tests
    qunit:
      all: ['tests/**/*.html']


  # Load tasks
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-qunit'


  # Default task(s).
  grunt.registerTask 'default', ['connect','watch']
  grunt.registerTask 'test', ['jshint','qunit']
  grunt.registerTask 'build', ['concat','test']
  grunt.registerTask 'release', ['concat','uglify','copy','test']
