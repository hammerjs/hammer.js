module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        meta: {
            banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n ' + '<%= pkg.homepage ? "* " + pkg.homepage + "\\n *\\n " : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> <<%= pkg.author.email %>>;\n' +
                ' * Licensed under the <%= pkg.license %> license */\n\n'
        },

        concat: {
            options: {
                banner: '<%= meta.banner %>',
                separator: '\n\n'
            },
            dist: {
                src: [
                    'src/intro.js',
                    'src/core.js',
                    'src/setup.js',
                    'src/instance.js',
                    'src/event.js',
                    'src/util.js',
                    'src/gesture.js',
                    'src/gestures.js',
                    'src/outro.js'
                ],
                dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
            }
        },

        jshint: {
            options: {
                browser: true
            },
            files: {
                src: ['Gruntfile.js', 'dist/<%= pkg.name %>-<%= pkg.version %>.js']
            }
        },

        uglify: {
            options: {
                banner: '<%= meta.banner %>'
            },
            build: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
                }
            }
        },

        watch: {
            scripts: {
                files: 'src/*.js',
                tasks: ['concat','jshint'],
                options: {
                    interrupt: true
                }
            }
        }
    });


    // Load tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');


    // Default task(s).
    grunt.registerTask('build', ['concat','jshint','uglify']);
    grunt.registerTask('default', ['watch']);

};