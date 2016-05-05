( function( global, expose ) {

  'use strict';

  // test for existence of module and module.exports which will clue us in
  // to a CommonJS environment
  if ( typeof module === 'object' && typeof module.exports === 'object' ) {

    // For CommonJS and CommonJS-like environments where a proper `window`
    // is present, execute the expose function to initialize Hammer and
    // expose to environment via AMD, CommonJS, etc.
    // For environments that do not have a `window` with a `document`
    // (such as Node.js), export a factory as module.exports.
    // This accentuates the need for the creation of a real `window`.
    // e.g. var hammertime = require("hammer")(window);
    if (global.document) {
      expose( global, global.document, 'Hammer' );
    } else {
      module.exports = function( w ) {
        if ( !w.document ) {
          throw new Error( 'Hammer requires a window with a document' );
        }
        return expose( w, w.document, 'Hammer' );
      };
    }
  } else {
    expose( global, global.document, 'Hammer' );
  }

// Pass this if window is not defined yet
}( typeof window !== 'undefined' ? window : this, function( window, document, exportName ) {

'use strict';
