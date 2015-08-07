// package metadata file for Meteor.js
'use strict';

var packageName = 'hammer:hammer';  // https://atmospherejs.com/hammer/hammer
var where = 'client';  // where to install: 'client' or 'server'. For both, pass nothing.

var packageJson = JSON.parse(Npm.require("fs").readFileSync('package.json'));

Package.describe({
  name: packageName,
  summary: 'Hammer.js (official) - multi-touch/mouse gestures: tap, pan, press, swipe, pinch, rotate',
  version: packageJson.version,
  git: 'https://github.com/hammerjs/hammer.js.git'
});

Package.onUse(function (api) {
  api.versionsFrom(['METEOR@0.9.0', 'METEOR@1.0']);
  api.export('Hammer');
  api.addFiles([
    'hammer.js',
    'meteor/export.js'
  ], where
  );
});

Package.onTest(function (api) {
  api.use(packageName, where);
  api.use('tinytest', where);

  api.addFiles('meteor/test.js', where);
});
