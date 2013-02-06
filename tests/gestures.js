var el = document.getElementById('toucharea');
var hammertime = Hammer(el);

/**
 * the Syn library doesnt work or something... needs more figuring out :-)
 */

/**
 * extend objects with new params
 */
/*
asyncTest('hold', function() {
    Syn.drag({
        from: "10x10",
        to:   "10x10",
        duration: hammertime.options.hold_timeout+10
    }, el);

    hammertime.on("hold", function() {
        ok(true, "Hold gesture");
        start();
    });
});
*/