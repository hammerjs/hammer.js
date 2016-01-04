var el, manager, touchAction,
	ORG_PREFIXED_TOUCH_ACTION = Hammer.PREFIXED_TOUCH_ACTION
	ORG_NATIVE_TOUCH_ACTION = Hammer.NATIVE_TOUCH_ACTION;

module('touchAction Tests', {
    setup: function() {
        el = utils.createHitArea();
        manager = {
        	options: Hammer.assign({}, Hammer.defaults),
        	handlers: {},
        	session: {},
        	recognizers: [],
        	element : el
        };
    },

    teardown: function() {
        if (touchAction) {
        	touchAction.destroy();
        	touchAction = null;
        }
        Hammer.PREFIXED_TOUCH_ACTION = ORG_PREFIXED_TOUCH_ACTION;
        Hammer.NATIVE_TOUCH_ACTION = ORG_NATIVE_TOUCH_ACTION;
        manager = null;
    }
});

test('check whether touch-action style is removed', function() {
	var originalTouchActionStyle = 'manipulation';

    // for not support browsers like phantomjs,...
	if (!Hammer.NATIVE_TOUCH_ACTION) {
		Hammer.PREFIXED_TOUCH_ACTION = 'touchAction';
	}
	el.style[Hammer.PREFIXED_TOUCH_ACTION] = originalTouchActionStyle;
    touchAction = new Hammer.TouchAction(manager, "compute");

    if (Hammer.NATIVE_TOUCH_ACTION) {
    	notEqual(originalTouchActionStyle, el.style[Hammer.PREFIXED_TOUCH_ACTION]);
    }

    touchAction.destroy();
    touchAction = null;
    equal(originalTouchActionStyle, el.style[Hammer.PREFIXED_TOUCH_ACTION], "returns original touch-action style.");
});


test('check whether canApplyStyle method returns a correct value', function() {
	touchAction = new Hammer.TouchAction(manager, "compute");
	Hammer.PREFIXED_TOUCH_ACTION = 'touchAction';

    Hammer.NATIVE_TOUCH_ACTION = false;
    equal(touchAction.canApplyStyle(), false, "if touch-action is not supported, canApplyStyle method should return false");

	Hammer.NATIVE_TOUCH_ACTION = true;
    equal(touchAction.canApplyStyle(), true, "if touch-action is supported, canApplyStyle method should return true");

    manager.element = {};
	equal(touchAction.canApplyStyle(), false, "if element does not include style property, canApplyStyle method should return false");
});
