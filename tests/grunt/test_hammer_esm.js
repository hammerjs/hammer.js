'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');

/**
 * Verify that the built ES module bundle (hammer.mjs) loads cleanly in Node.js
 * without window/document, contains no UMD/CJS wrapper, and exposes all named exports.
 *
 * @param {String} esmPath - Path to hammer.mjs
 * @param {String} expectedVersion - Expected Hammer.VERSION from package.json
 * @returns {Promise<void>}
 */
function testHammerEsm(esmPath, expectedVersion) {
    var resolved = path.resolve(esmPath);
    var source = fs.readFileSync(resolved, 'utf8');
    if (source.indexOf('module.exports') !== -1 || source.indexOf('define.amd') !== -1) {
        return Promise.reject(new Error('hammer.mjs must not contain CommonJS or AMD UMD wrapper code'));
    }

    var esmUrl = url.pathToFileURL(resolved).href + '?t=' + Date.now();
    return import(esmUrl).then(function(mod) {
        if (typeof mod.default !== 'function' || mod.VERSION !== expectedVersion) {
            throw new Error('SSR ESM load failed to expose default Hammer export');
        }
        Object.keys(mod.default).forEach(function(key) {
            if (mod[key] !== mod.default[key]) {
                throw new Error('hammer.mjs missing or mismatched named export: ' + key);
            }
        });
    });
}

module.exports = testHammerEsm;

if (require.main === module) {
    var pkg = require('../../package.json');
    testHammerEsm(path.resolve(__dirname, '../../hammer.mjs'), pkg.version).then(function() {
        console.log('hammer.mjs Node ESM test passed.');
    }).catch(function(err) {
        console.error(err.stack || err.message);
        process.exit(1);
    });
}
