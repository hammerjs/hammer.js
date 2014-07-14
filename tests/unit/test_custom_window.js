var el;

module('Tests', {
    setup: function() {
        el = utils.createHitArea();
    },

    teardown: function() {
    }
});

test('should use the passed window', function() {
    expect(1);

    throws(function() {
        new Hammer(el, { window: {} });
    });
});
