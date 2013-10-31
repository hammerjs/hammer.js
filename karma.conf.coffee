# an example karma.conf.coffee
module.exports = (config) ->
  browsers = ['Chrome','Firefox']
  if process.env.TRAVIS
    browsers = 'SL_Chrome,SL_Safari,SL_Firefox,SL_IE_8,SL_IE_9,SL_IE_10,SL_ANDROID_4,SL_IOS_4,SL_IOS_5,SL_IOS_6'.split(",")

  config.set
    frameworks: ['qunit']
    logLevel: config.LOG_DEBUG
    logColors: true
    browsers: browsers
    browserDisconnectTimeout: 5000
    singleRun: true
    files: [
      'node_modules/underscore/underscore.js'
      'node_modules/faketouches/faketouches.js'
      'hammer.js'
      'tests/*.js'
    ]

    # config for Travis CI
    sauceLabs:
      username: 'eightmedia'
      accessKey: '974a3041-9fa1-4710-94cd-3802d418ff79'
      testName: 'Hammer.js'
      startConnect: true
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER


    # For more browsers on Sauce Labs see:
    # https://saucelabs.com/docs/platforms/webdriver
    customLaunchers:
      'SL_Chrome':
        base: 'SauceLabs',
        browserName: 'chrome'

      'SL_Firefox':
        base: 'SauceLabs',
        browserName: 'firefox'

      'SL_Safari':
        base: 'SauceLabs'
        browserName: 'safari'
        platform: 'Mac 10.8'
        version: '6'

      'SL_IE_8':
        base: 'SauceLabs',
        browserName: 'internet explorer'
        platform: 'Windows 7'
        version: '8'

      'SL_IE_9':
        base: 'SauceLabs'
        browserName: 'internet explorer'
        platform: 'Windows 8'
        version: '9'

      'SL_IE_10':
        base: 'SauceLabs'
        browserName: 'internet explorer'
        platform: 'Windows 8'
        version: '10'

      'SL_ANDROID_4':
        base: 'SauceLabs'
        browserName: 'android'
        platform: 'Linux'
        version: '4.0'
        'device-orientation': 'portrait'

      'SL_IOS_4':
        base: 'SauceLabs'
        browserName: 'iphone'
        platform: 'OS X 10.6'
        version: '4'
        'device-orientation': 'portrait'

      'SL_IOS_5':
        base: 'SauceLabs'
        browserName: 'iphone'
        platform: 'OS X 10.6'
        version: '5.0'
        'device-orientation': 'portrait'

      'SL_IOS_6':
        base: 'SauceLabs'
        browserName: 'iphone'
        platform: 'OS X 10.8'
        version: '6.0'
        'device-orientation': 'portrait'


  if process.env.TRAVIS
    # Debug logging into a file, that we print out at the end of the build.
    config.loggers.push
      type: 'file'
      filename: "#{process.env.LOGS_DIR}/karma.log"
      level: config.LOG_DEBUG