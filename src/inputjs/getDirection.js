import {abs} from '../utils/utilsConsts';
import {DIRECTION_NONE,DIRECTION_LEFT,DIRECTION_RIGHT,DIRECTION_UP,DIRECTION_DOWN} from './inputConsts';

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
export default function getDirection(x, y) {
    if (x === y) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}
