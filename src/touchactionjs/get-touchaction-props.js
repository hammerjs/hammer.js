import { NATIVE_TOUCH_ACTION } from './touchaction-Consts';

export default function getTouchActionProps() {
  if (!NATIVE_TOUCH_ACTION) {
    return false;
  }
  let touchMap = {};
  let cssSupports = window.CSS && window.CSS.supports;
  ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach((val) => {

    // If css.supports is not supported but there is native touch-action assume it supports
    // all values. This is the case for IE 10 and 11.
    return touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
  });
  return touchMap;
}
