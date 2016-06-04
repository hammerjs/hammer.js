import {STATE_CANCELLED,STATE_ENDED,STATE_CHANGED,STATE_BEGAN} from './recognizerConsts';

/**
 * get a usable string, used as event postfix
 * @param {constant} state
 * @returns {String} state
 */
function stateStr(state) {
    if (state & STATE_CANCELLED) {
        return 'cancel';
    } else if (state & STATE_ENDED) {
        return 'end';
    } else if (state & STATE_CHANGED) {
        return 'move';
    } else if (state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}

export {stateStr};
