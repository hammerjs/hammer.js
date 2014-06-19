var parent,
    child,
    hammerChild,
    hammerParent;

module('Tap', {

    setup: function () {

        parent = document.createElement('div');
        child = document.createElement("div");

        document.body.appendChild(parent);
        parent.appendChild(child);

        hammerParent = new Hammer.Manager(parent, {
            touchAction: 'none'
        });
        hammerChild = new Hammer.Manager(child, {
            touchAction: 'none'
        });

    },
    teardown: function () {
        document.body.removeChild(parent);
        hammerChild.destroy();
        hammerParent.destroy();
    }

});

test('Tap gesture should not be recognized with unique touchend event in the session', function()
{
    expect(1);

    hammerChild.add(new Hammer.Tap());

    hammerParent.on('tap', function() {
        throw new Error('parent tap gesture should not be recognized');
    });

    testUtils.dispatchTouchEvent(child, 'end', 0, 10);
    ok(true);

});
