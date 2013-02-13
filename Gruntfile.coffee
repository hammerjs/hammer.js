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
        banner: '<%= meta.banner %>'
        separator: '\n\n'
      dist:
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
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      jquery:
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js'
          'plugins/jquery.hammer.js']
        dest: 'dist/jquery.<%= pkg.name %>-<%= pkg.version %>.js'

    # copy src to latest version
    copy:
      latest:
        src: ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
        dest: 'dist/<%= pkg.name %>-latest.js'
      latestmin:
        src: ['dist/<%= pkg.name %>-<%= pkg.version %>.min.js']
        dest: 'dist/<%= pkg.name %>-latest.min.js'
      jquery:
        src: ['dist/jquery.<%= pkg.name %>-<%= pkg.version %>.js']
        dest: 'dist/jquery.<%= pkg.name %>-latest.js'
      jquerymin:
        src: ['dist/jquery.<%= pkg.name %>-<%= pkg.version %>.min.js']
        dest: 'dist/jquery.<%= pkg.name %>-latest.min.js'

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

    # minify the sourcecode
    uglify:
      build:
        options:
          banner: '<%= meta.banner %>'
        files:
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
          'dist/<%= pkg.name %>-latest.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.min.js']
          'dist/jquery.<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/jquery.<%= pkg.name %>-<%= pkg.version %>.js']

    # watch for changes
    watch:
      scripts:
        files: 'src/*.js'
        tasks: ['concat:dist','copy:latest']
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
  grunt.loadNpmTasks 'grunt-notify'


  # Default task(s).
  grunt.registerTask 'build', ['notify_hooks','concat','test','uglify','copy']
  grunt.registerTask 'default', ['notify_hooks','connect','watch']
  grunt.registerTask 'test', ['jshint','qunit']