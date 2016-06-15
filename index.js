/* jshint node:true */
/* global module, process */
'use strict';

module.exports = {
  name: 'history',

  included: function(app, parentAddon) {
    this._super.included.apply(this, arguments);

    // Quick fix for add-on nesting
    // https://github.com/aexmachina/ember-cli-sass/blob/v5.3.0/index.js#L73-L75
    // see: https://github.com/ember-cli/ember-cli/issues/3718
    while (typeof app.import !== 'function' && (app.app || app.parent)) {
      app = app.app || app.parent;
    }

    // if app.import and parentAddon are blank, we're probably being consumed by an in-repo-addon
    // or engine, for which the "bust through" technique above does not work.
    if (typeof app.import !== 'function' && !parentAddon) {
      if (app.registry && app.registry.app) {
        app = app.registry.app;
      }
    }

    if (!parentAddon && typeof app.import !== 'function') {
      throw new Error('ember-history is being used within another addon or engine and is' +
        ' having trouble registering itself to the parent application.');
    }

    this.importDependencies(app);
  },

  isDevelopingAddon: function() {
    return true;
  },

  importDependencies: function(app) {
    if (arguments.length < 1) {
      throw new Error('Application instance must be passed to import');
    }

    var vendor = this.treePaths.vendor;

    if (!process.env.EMBER_CLI_FASTBOOT) {
      if (app.env === "production") {
        app.import(app.bowerDirectory + '/gsap/src/minified/plugins/CSSPlugin.min.js', { prepend: true });
      } else {
        app.import(app.bowerDirectory + '/gsap/src/uncompressed/plugins/CSSPlugin.js', { prepend: true });
      }
    }

    app.import(vendor + '/shims/tweenlite.js');
  }
};
