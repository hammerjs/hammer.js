/**
 * Path
 * Recognized when the pointer is down and moves following a path.
 * @constructor
 * @extends AttrRecognizer
 */
function PathRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pathTotalLength = this.options.pathElement.getTotalLength();
    this.segmentLength = (this.pathTotalLength / this.options.resolution);
    this.currentSegmentIndex = 0; //which segment should we match against next
    this.pX = null;
    this.pY = null;

    this.state = STATE_BEGAN;

}

inherit(PathRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PathRecognizer
     */
    defaults: {
        event: 'path',
        threshold: 5,
        pointers: 1,
        resolution: 10, //path will be quantizied to this amount of segments
        maxDistanceFromSegment: 30
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input);
    },

    emit: function(input) {
        this.pX = input.deltaX;
        this.pY = input.deltaY;

        this._super.emit.call(this, input);
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        if (!this.attrTest(input)) {
            return STATE_FAILED;
        }

        var svgCoords = getSvgLocalPoint(this.options.svgElement, input.center.x, input.center.y);

        input.localX = svgCoords.x;
        input.localY = svgCoords.y;

        var closestPoint = findClosestPoint(this.options.pathElement, svgCoords);
        this.pathPercent = input.pathPercent = closestPoint.pathPercent;
        this.pathLength = input.pathLength = closestPoint.pathLength;

        //veer too far from path - fail
        if (closestPoint.distance > this.options.maxDistanceFromSegment) {
            input.pathComplete = false;
            return STATE_ENDED;
        }
        else if (input.distance === 0 && this.state != STATE_BEGAN) {
            return STATE_BEGAN;
        }
        else if (this.currentSegmentIndex == this.options.resolution && (100 - this.pathPercent) < 0.9) {
            input.pathComplete = true;
            return STATE_RECOGNIZED;
        }
        else if (this.pathPercent / 100 > (this.currentSegmentIndex) * this.segmentLength / this.pathTotalLength &&
            this.pathPercent / 100 < (this.currentSegmentIndex + 1) * this.segmentLength / this.pathTotalLength) {
            this.currentSegmentIndex++;
        }
        //start drawing path from middle or jump ahead - fail
        else if (this.pathPercent / 100 > (this.currentSegmentIndex + 1) * this.segmentLength / this.pathTotalLength) {
            input.pathComplete = false;
            return STATE_ENDED;
        }
        //stop input before reaching end - fail
        else if (input.eventType == INPUT_END) {
            input.pathComplete = false;
            return STATE_ENDED;
        }

        return STATE_CHANGED;

    }
});

// var distance = function(p1, p2) {
//     return Math.sqrt((p2.x -= p1.x) * p2.x + (p2.y -= p1.y) * p2.y);
// };

//adapted from https://bl.ocks.org/mbostock/8027637
function findClosestPoint(pathNode, point) {
    var pathLength = pathNode.getTotalLength(),
        precision = 8,
        best,
        bestLength,
        bestDistance = Infinity;

    // linear scan for coarse approximation
    for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
        if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
            best = scan, bestLength = scanLength, bestDistance = scanDistance;
        }
    }

    // binary search for precise estimate
    precision /= 2;
    while (precision > 0.5) {
        var before,
            after,
            beforeLength,
            afterLength,
            beforeDistance,
            afterDistance;
        if ((beforeLength = bestLength - precision) >= 0 &&
            (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
            best = before, bestLength = beforeLength, bestDistance = beforeDistance;
        } else if ((afterLength = bestLength + precision) <= pathLength &&
            (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
            best = after, bestLength = afterLength, bestDistance = afterDistance;
        } else {
            precision /= 2;
        }
    }

    best = {
        x: best.x,
        y: best.y,
        distance: Math.sqrt(bestDistance),
        pathLength: bestLength,
        pathPercent: (bestLength / pathLength * 100 * 100) / 100
    };

    return best;

    function distance2(p) {
        var dx = p.x - point.x,
            dy = p.y - point.y;
        return dx * dx + dy * dy;
    }
}

// Get point in global SVG space
var getSvgLocalPoint = (function() {
        var pt = null;

        return function(svg, x, y) {

            if (pt == null) {
                pt = svg.createSVGPoint();
            }

            pt.x = x;
            pt.y = y;
            return pt.matrixTransform(svg.getScreenCTM().inverse());

        };

    })();
