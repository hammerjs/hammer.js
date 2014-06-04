module("eventEmitter");

test("test the eventemitter", function() {
    expect(7);

    var ee = new EventEmitter();

    function event3Handler() {
        ok(true, "emitted event3");
    }

    ee.on("testEvent1", function() { ok(true, "emitted event"); });
    ee.on("testEvent2", function(ev) {
        ok(true, "emitted event");
        ev.preventDefault();
        ev.stopPropagation();
        ok(ev.target === document.body, 'target is the body');
    });
    ee.on("testEvent3", event3Handler);

    ee.emit("testEvent1");
    ee.emit("testEvent3");
    ee.emit("testEvent2", {
        srcEvent: {
            preventDefault: function() { ok(true, "preventDefault ref"); },
            stopPropagation: function() { ok(true, "stopPropagation ref"); },
            target: document.body
        }
    });

    // unbind testEvent2
    ee.off("testEvent2");
    ee.off("testEvent3", event3Handler);

    ee.emit("testEvent2"); // doenst trigger a thing
    ee.emit("testEvent1"); // should trigger testEvent1 again
    ee.emit("testEvent3"); // doenst trigger a thing

    // destroy
    ee.destroy();

    ee.emit("testEvent2"); // doenst trigger a thing
    ee.emit("testEvent1"); // doenst trigger a thing
});
