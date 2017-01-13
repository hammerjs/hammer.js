// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals,requireTemplateStringsForConcatenation,requireArrayDestructuring
/* globals QUnit,Hammer,utils,Simulator */

var el, el2,
    hammer, hammer2;

QUnit.module('Tests', {
    beforeEach: function() {
        el = utils.createHitArea();
        el2 = utils.createHitArea();
      },

    afterEach: function() {
        if (hammer) {
          hammer.destroy();
          hammer = null;
        }
        if (hammer2) {
          hammer2.destroy();
          hammer2 = null;
        }
      }
  });

//  since Hammer is now a ES6 Class and we cannot call a class as a function,
//  it needs a `new` keyword prefixed that makes this Shortcut test kinda Redundant.

// QUnit.test( "hammer shortcut", function( assert ) {
//     assert.expect( 2 );
//
//     Hammer.defaults.touchAction = "pan-y";
//     hammer = Hammer( el );
//
//     assert.ok( hammer instanceof Hammer.Manager, "returns an instance of Manager" );
//     assert.ok( hammer.touchAction.actions == Hammer.defaults.touchAction, "set the default touchAction" );
// } );
//
// QUnit.test( "hammer shortcut with options", function( assert ) {
//     assert.expect( 2 );
//
//     hammer = Hammer( el, {
//         touchAction: "none"
//     } );
//     assert.ok( hammer instanceof Hammer.Manager, "returns an instance of Manager" );
//     assert.ok( hammer.touchAction.actions == "none", "set the default touchAction" );
// } );

/* Creating a hammer instance does not work on the same way
 * when using Hammer or Hammer.Manager.
 *
 * This can confuse developers who read tests to use the library when doc is missing.
 */
QUnit.test('Hammer and Hammer.Manager constructors work exactly on the same way.', function(assert) {
    assert.expect(2);

    hammer = new Hammer(el, {});
    assert.equal(Hammer.defaults.preset.length, hammer.recognizers.length,
      'Correct number of recognizers by default');

    hammer2 = new Hammer.Manager(el, {});
    assert.equal(0, hammer2.recognizers.length, 'No default recognizers with manager and empty object');
  });

/* DOC to disable default recognizers should be added.
 *
 * - Hammer(el).      IMO: Currently, well done.
 * - Hammer(el, {}) . IMO: should disable default recognizers
 * - Hammer(el, {recognizers: null}).      IMO: now, it fails.
 * - Hammer(el, {recognizers: []}).  It works, but it is likely not intuitive.
 */
QUnit.test('A Hammer instance can be setup to not having default recognizers.', function(assert) {
    assert.expect(1);

    hammer = new Hammer(el, { recognizers: false });
    assert.equal(0, hammer.recognizers.length, 'No default recognizers with recognizers false');
  });

/* The case was when I added a custom tap event which was added to the default
 * recognizers, and my custom tap gesture wasn't working (I do not know exactly the reason),
 * but removing the default recognizers solved the issue.
 */
QUnit.test('Adding the same recognizer type should remove the old recognizer', function(assert) {
    assert.expect(4);

    hammer = new Hammer(el);

    assert.ok(!!hammer.get('tap'));
    assert.equal(7, hammer.recognizers.length, '7 recognizers found');

    var newTap = new Hammer.Tap({ time: 1337 });
    hammer.add(newTap);

    assert.equal(7, hammer.recognizers.length, '7 recognizers found after adding tap');
    assert.equal(1337, hammer.get('tap').options.time, 'Time has been updated to reflect new tap');
  });

/*
 * Swipe gesture:
 * - in this tests, it does not update input.velocity ( always 0)
 * - does not fire swipeleft or swiperight events
 */
QUnit.test('Swiping to the left should fire swipeleft event', function(assert) {
    var done = assert.async();
    assert.expect(2);

    hammer = new Hammer(el, { recognizers: [] });
    hammer.add(new Hammer.Swipe());
    hammer.on('swipe swipeleft', function() {
        assert.ok(true);
      });

    Simulator.gestures.swipe(el, { pos: [ 300, 300 ], deltaY: 0, deltaX: -200 }, function() {
        done();
      });
  });

/*
 * Input target change
 */
QUnit.test('Should detect input while on other element', function(assert) {
    var done = assert.async();
    assert.expect(1);

    hammer = new Hammer(el, { inputTarget: document.body });
    hammer.on('tap', function() {
        assert.ok(true);
      });

    Simulator.gestures.tap(document.body, null, function() {
        done();
      });
  });

/* Hammer.Manager constructor accepts a "recognizers" option in which each
 * element is an array representation of a Recognizer.
 */
QUnit.test('Hammer.Manager accepts recognizers as arrays.', function(assert) {
    assert.expect(4);

    hammer = new Hammer.Manager(el, {
        recognizers: [
            [ Hammer.Swipe ],
            [ Hammer.Pinch ],
            [ Hammer.Rotate ],
            [ Hammer.Pan, { direction: Hammer.DIRECTION_UP }, [ 'swipe', 'pinch' ], [ 'rotate' ] ]
        ]
      });
    assert.equal(4, hammer.recognizers.length, '4 recognizers found');

    var recognizerActual = hammer.recognizers[ 3 ];
    assert.equal(recognizerActual.options.direction, Hammer.DIRECTION_UP,
      'Recognize direction from options');
    assert.equal(2, Object.keys(recognizerActual.simultaneous).length, '2 simultanious recognizers found');
    assert.equal(1, recognizerActual.requireFail.length, '1 require failing recognizer found');
  });

/*
 * Removing a recognizer which cannot be found would errantly remove the last recognizer in the
 * manager's list.
 */
QUnit.test('Remove non-existent recognizer.', function(assert) {
    assert.expect(1);

    hammer = new Hammer(el, { recognizers: [] });
    hammer.add(new Hammer.Swipe());
    hammer.remove('tap');

    assert.equal(1, hammer.recognizers.length, '1 recognizer found');
  });

QUnit.test('check whether Hammer.defaults.cssProps is restored', function(assert) {
    var beforeCssProps = {
        userSelect: 'text',
        touchSelect: 'grippers',
        touchCallout: 'default',
        contentZooming: 'chained',
        userDrag: 'element',
        tapHighlightColor: 'rgba(0, 1, 0, 0)'
      };
    var prop;
    Hammer.each(Hammer.defaults.cssProps, function(value, name) {
        prop = Hammer.prefixed(el.style, name);
        if (prop) {
          el.style[ prop ] = beforeCssProps[ name ];
        }
      });

    hammer = new Hammer(el);
    hammer.destroy();
    hammer = null;
    Hammer.each(Hammer.defaults.cssProps, function(value, name) {
        prop = Hammer.prefixed(el.style, name);
        if (prop) {
          assert.equal(el.style[ prop ], beforeCssProps[ name ], 'check if ' + name + ' is restored');
        }
      });
  });
