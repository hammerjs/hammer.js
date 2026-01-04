import {GestureManager} from './gesture_manager';
import {DragRecognizer} from './recognizers/drag_recognizer';
import {LongPressRecognizer} from './recognizers/long_press_recognizer';
import {PinchRotateRecognizer} from './recognizers/pinch_rotate_recognizer';
import {SwipeRecognizer} from './recognizers/swipe_recognizer';
import {TapRecognizer} from './recognizers/tap_recognizer';

export default class Hammer extends GestureManager {
  static Drag = DragRecognizer;
  static LongPress = LongPressRecognizer;
  static PinchRotate = PinchRotateRecognizer;
  static Swipe = SwipeRecognizer;
  static Tap = TapRecognizer;
}
