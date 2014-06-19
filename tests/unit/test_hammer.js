module('hammer');
test('hammer shortcut', function () {
    Hammer.defaults.touchAction = 'pan-y';
    var mc = Hammer(document.querySelector('#qunit-fixture'));
    ok(mc instanceof Manager, "returns an instance of Manager");
    ok(mc.touchAction.actions[0] == Hammer.defaults.touchAction, "set the default touchAction");
    mc.destroy();
});

test('hammer shortcut with options', function () {
    var mc = Hammer(document.querySelector('#qunit-fixture'), {
        touchAction: 'none'
    });
    ok(mc instanceof Manager, "returns an instance of Manager");
    ok(mc.touchAction.actions[0] == 'none', "set the default touchAction");
    mc.destroy();
});

test('hammer shortcut without options and get touchAction from the style attribute', function () {
    var el = document.querySelector('#qunit-fixture');
    el.style.touchAction = 'pan-x';

    var mc = Hammer(el);
    ok(mc instanceof Manager, "returns an instance of Manager");
    ok(mc.touchAction.actions[0] == 'pan-x', "get the touchAction from the element.style");
    mc.destroy();

    el.style.touchAction = '';
});
