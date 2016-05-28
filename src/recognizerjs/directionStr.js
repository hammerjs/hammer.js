/**
 * Created by arjun on 25/05/16.
 */
import {DIRECTION_LEFT,DIRECTION_RIGHT,DIRECTION_UP,DIRECTION_DOWN} from '../inputjs/inputConsts'
/**
 * direction cons to string
 * @param {constant} direction
 * @returns {String}
 */
function directionStr(direction) {
    if (direction == DIRECTION_DOWN) {
        return 'down';
    } else if (direction == DIRECTION_UP) {
        return 'up';
    } else if (direction == DIRECTION_LEFT) {
        return 'left';
    } else if (direction == DIRECTION_RIGHT) {
        return 'right';
    }
    return '';
}

export {directionStr}