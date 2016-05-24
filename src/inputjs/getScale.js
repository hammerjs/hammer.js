/**
 * 
 * Created by arjun on 20/05/16.
 */
import {PROPS_CLIENT_XY} from './inputConsts';
import {getDistance} from './getDistance';
/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

export {getScale};