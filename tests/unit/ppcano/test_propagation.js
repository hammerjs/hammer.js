var parent,
    child,
    hammerChild,
    hammerParent;

module('Propagation (Tap in Child and Parent)', {

  setup: function() {

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

    hammerChild.add(new Hammer.Tap());
    hammerParent.add(new Hammer.Tap());

  },
  teardown: function() {
    document.body.removeChild(parent);
    hammerChild.destroy();
    hammerParent.destroy();
  }
      
});

test('Tap on the child, fires also the tap event to the parent', function()
{
    expect(2);

    hammerChild.on('tap', function() {
      ok(true);
    });
    hammerParent.on('tap', function() {
      ok(true);
    });

    dispatchEvent(child, 'start', 0, 10);
    dispatchEvent(child, 'end', 0, 10);

});

test('When tap on the child and the child stops the input event propagation, the tap event does not get fired in the parent', function()
{
    expect(1);

    hammerChild.on('tap', function() {
      ok(true);
    });
    hammerParent.on('tap', function() {
      throw new Error('parent tap gesture should not be recognized');
    });

    child.addEventListener('touchend', function(ev) {
      ev.stopPropagation();
    });

    dispatchEvent(child, 'start', 0, 10);
    dispatchEvent(child, 'end', 0, 10);

});

