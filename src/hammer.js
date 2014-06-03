/**
 * create an manager with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var manager = new Manager(element, options);

    /**
     * setup recognizers
     * the defauls.recognizers contains an array like this;
     * [ RecognizerClass, options, join ],
     * [ .... ]
     */
    each(manager.options.recognizers, function(item) {
        var recognizer = manager.add(new (item[0])(item[1]));
        if(item[2]) {
            recognizer.join(item[2]);
        }
    });

    return manager;
}

Hammer.VERSION = '{{PKG_VERSION}}';
