import {GestureArena, type GestureArenaOptions} from './gesture_arena';
import {GestureManager, type GestureManagerOptions} from './gesture_manager';
import {
  type GestureEventData,
  GestureRecognizer,
  RecognizerState,
  type RecognizerStateType,
} from './gesture_recognizer';
import {
  type HistoricalSample,
  MotionAction,
  type MotionActionType,
  MotionEvent,
  type MotionEventInit,
  MotionEventStream,
  type Point,
  type PointerSample,
} from './motion_event';
import {
  type CardinalDirection,
  type FlingCallbacks,
  type FlingDirectionFilter,
  type FlingEventData,
  type FlingOptions,
  FlingRecognizer,
  type GestureAxis,
} from './recognizers/fling_recognizer';
import {
  type LongPressCallbacks,
  type LongPressEventData,
  type LongPressOptions,
  LongPressRecognizer,
} from './recognizers/long_press_recognizer';
import {
  type PanCallbacks,
  type PanDirection,
  type PanEventData,
  type PanOptions,
  PanRecognizer,
} from './recognizers/pan_recognizer';
import {
  type RotateCallbacks,
  type RotateEventData,
  type RotateOptions,
  RotateRecognizer,
} from './recognizers/rotate_recognizer';
import {
  type ScaleCallbacks,
  type ScaleEventData,
  type ScaleOptions,
  ScaleRecognizer,
} from './recognizers/scale_recognizer';
import {
  type TapCallbacks,
  type TapEventData,
  type TapOptions,
  TapRecognizer,
} from './recognizers/tap_recognizer';
import {
  allowsPinchZoom,
  applySurfaceBehavior,
  mergeTouchActions,
  resolveSupportedTouchAction,
  type TouchActionSetting,
  type TouchActionValue,
} from './touch_behavior';
import {
  VelocityTracker,
  type VelocityTrackerOptions,
  type VelocityVector,
} from './velocity_tracker';
import {
  DEFAULT_VIEW_CONFIGURATION,
  resolveViewConfiguration,
  type ViewConfiguration,
} from './view_configuration';

export {
  GestureManager,
  GestureArena,
  GestureRecognizer,
  RecognizerState,
  MotionEvent,
  MotionEventStream,
  MotionAction,
  VelocityTracker,
  DEFAULT_VIEW_CONFIGURATION,
  resolveViewConfiguration,
  mergeTouchActions,
  resolveSupportedTouchAction,
  allowsPinchZoom,
  applySurfaceBehavior,
  TapRecognizer,
  LongPressRecognizer,
  PanRecognizer,
  FlingRecognizer,
  ScaleRecognizer,
  RotateRecognizer,
};

export type {
  Point,
  PointerSample,
  HistoricalSample,
  MotionActionType,
  MotionEventInit,
  RecognizerStateType,
  GestureEventData,
  GestureArenaOptions,
  GestureManagerOptions,
  TouchActionValue,
  TouchActionSetting,
  ViewConfiguration,
  VelocityTrackerOptions,
  VelocityVector,
  TapOptions,
  TapEventData,
  TapCallbacks,
  LongPressOptions,
  LongPressEventData,
  LongPressCallbacks,
  PanDirection,
  PanOptions,
  PanEventData,
  PanCallbacks,
  CardinalDirection,
  GestureAxis,
  FlingDirectionFilter,
  FlingOptions,
  FlingEventData,
  FlingCallbacks,
  ScaleOptions,
  ScaleEventData,
  ScaleCallbacks,
  RotateOptions,
  RotateEventData,
  RotateCallbacks,
};

export default class Hammer extends GestureManager {
  static Tap = TapRecognizer;
  static LongPress = LongPressRecognizer;
  static Pan = PanRecognizer;
  static Fling = FlingRecognizer;
  static Scale = ScaleRecognizer;
  static Rotate = RotateRecognizer;

  static GestureManager = GestureManager;
  static GestureArena = GestureArena;
  static GestureRecognizer = GestureRecognizer;
  static VelocityTracker = VelocityTracker;
  static MotionEvent = MotionEvent;
  static MotionEventStream = MotionEventStream;
  static MotionAction = MotionAction;
  static RecognizerState = RecognizerState;
  static DEFAULT_VIEW_CONFIGURATION = DEFAULT_VIEW_CONFIGURATION;
  static mergeTouchActions = mergeTouchActions;
}
