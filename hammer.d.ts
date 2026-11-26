export interface HammerPoint {
    x: number;
    y: number;
}

export interface CssProps {
    userSelect?: string;
    touchSelect?: string;
    touchCallout?: string;
    contentZooming?: string;
    userDrag?: string;
    tapHighlightColor?: string;
    [prop: string]: string | undefined;
}

export type HammerPointerType = 'touch' | 'mouse' | 'pen' | 'kinect' | (string & {});

export interface HammerInput {
    /** Name of the event, e.g. 'panstart', 'swipeleft', 'tap'. */
    type: string;
    /** Movement on the X axis. */
    deltaX: number;
    /** Movement on the Y axis. */
    deltaY: number;
    /** Total time in ms since the first input. */
    deltaTime: number;
    /** Distance moved. */
    distance: number;
    /** Angle moved in degrees. */
    angle: number;
    /** Recency-weighted velocity on the X axis, in px/ms. */
    velocityX: number;
    /** Recency-weighted velocity on the Y axis, in px/ms. */
    velocityY: number;
    /** Highest magnitude velocityX/velocityY value, in px/ms. */
    velocity: number;
    /** Overall velocity over the full gesture duration, in px/ms. */
    overallVelocity: number;
    /** Overall X velocity over the full gesture duration, in px/ms. */
    overallVelocityX: number;
    /** Overall Y velocity over the full gesture duration, in px/ms. */
    overallVelocityY: number;
    /** Direction of current motion. Matches the DIRECTION constants. */
    direction: number;
    /** Direction from the starting point. Matches the DIRECTION constants. */
    offsetDirection: number;
    /** Scaling factor for multi-touch gestures (1 for single touch). */
    scale: number;
    /** Rotation in degrees for multi-touch gestures (0 for single touch). */
    rotation: number;
    /** Center position of all active pointers. */
    center: HammerPoint;
    /** Source DOM event (TouchEvent, MouseEvent, or PointerEvent). */
    srcEvent: TouchEvent | MouseEvent | PointerEvent;
    /** Target element that received the event. */
    target: HTMLElement | EventTarget;
    /** Primary pointer type ('touch', 'mouse', 'pen', or 'kinect'). */
    pointerType: HammerPointerType;
    /** Event lifecycle type. Matches the INPUT constants. */
    eventType: 1 | 2 | 4 | 8;
    /** True on the first input of a session. */
    isFirst: boolean;
    /** True on the final input of a session. */
    isFinal: boolean;
    /** Array with all active pointers. */
    pointers: any[];
    /** Array with all changed pointers for this event. */
    changedPointers: any[];
    /** Maximum number of simultaneous pointers detected in the gesture. */
    maxPointers: number;
    /** Timestamp of the input event in ms. */
    timeStamp: number;
    /** Directional event name emitted alongside pan events, e.g. 'panleft'. */
    additionalEvent?: string;
    /** Number of taps recognized by TapRecognizer. */
    tapCount?: number;
    /** Calls srcEvent.preventDefault(). */
    preventDefault: () => void;
}

export type HammerListener = (event: HammerInput) => void;

export interface HammerInputInstance {
    manager: HammerManager;
    callback: (manager: HammerManager, eventType: number, input: any) => void;
    element: HTMLElement | SVGElement | EventTarget;
    target: EventTarget;
    domHandler: (ev: Event) => void;
    handler(ev: any): void;
    init(): void;
    destroy(): void;
}

export interface HammerInputConstructor {
    new (manager: HammerManager, callback: (manager: HammerManager, eventType: number, input: any) => void): HammerInputInstance;
}

export interface TouchAction {
    manager: HammerManager;
    actions: string;
    set(value: string): void;
    update(): void;
    compute(): string;
    preventDefaults(input: HammerInput): void;
    preventSrc(srcEvent: Event): void;
}

export interface TouchActionConstructor {
    new (manager: HammerManager, value: string): TouchAction;
}

export interface RecognizerOptions {
    event?: string;
    enable?: boolean | ((recognizer: Recognizer, inputData?: HammerInput) => boolean);
    pointers?: number;
    threshold?: number;
    direction?: number;
    velocity?: number;
    taps?: number;
    interval?: number;
    time?: number;
    posThreshold?: number;
}

export interface Recognizer {
    id: number;
    options: RecognizerOptions;
    defaults: RecognizerOptions;
    manager: HammerManager | null;
    state: number;
    simultaneous: { [id: number]: Recognizer };
    requireFail: Recognizer[];

    set(options?: RecognizerOptions): this;
    recognizeWith(otherRecognizer: Recognizer | Recognizer[] | string): this;
    dropRecognizeWith(otherRecognizer: Recognizer | Recognizer[] | string): this;
    requireFailure(otherRecognizer: Recognizer | Recognizer[] | string): this;
    dropRequireFailure(otherRecognizer: Recognizer | Recognizer[] | string): this;
    hasRequireFailures(): boolean;
    canRecognizeWith(otherRecognizer: Recognizer): boolean;
    canEmit(): boolean;
    emit(input: HammerInput): void;
    tryEmit(input?: HammerInput): void;
    recognize(inputData: HammerInput): void;
    process(inputData: HammerInput): number;
    getTouchAction(): string[];
    reset(): void;
}

export interface RecognizerStatic<T extends Recognizer = Recognizer> {
    new (options?: RecognizerOptions): T;
}

export interface AttrRecognizer extends Recognizer {
    attrTest(input: HammerInput): boolean;
}

export interface TapRecognizer extends Recognizer {}
export interface PanRecognizer extends AttrRecognizer {
    directionTest(input: HammerInput): boolean;
}
export interface SwipeRecognizer extends AttrRecognizer {}
export interface PinchRecognizer extends AttrRecognizer {}
export interface RotateRecognizer extends AttrRecognizer {}
export interface PressRecognizer extends Recognizer {}

export type RecognizerTuple =
    | [RecognizerStatic]
    | [RecognizerStatic, RecognizerOptions]
    | [RecognizerStatic, RecognizerOptions, string | string[]]
    | [RecognizerStatic, RecognizerOptions, string | string[], string | Recognizer | Array<string | Recognizer>];

export interface HammerOptions {
    domEvents?: boolean;
    touchAction?: string;
    enable?: boolean | ((manager: HammerManager) => boolean);
    inputTarget?: EventTarget | null;
    inputClass?: HammerInputConstructor | null;
    pointerTypes?: HammerPointerType[] | null;
    preset?: RecognizerTuple[];
    recognizers?: RecognizerTuple[];
    cssProps?: CssProps;
}

export interface HammerDefaults extends HammerOptions {
    domEvents: boolean;
    touchAction: string;
    enable: boolean;
    inputTarget: EventTarget | null;
    inputClass: HammerInputConstructor | null;
    pointerTypes: HammerPointerType[] | null;
    preset: RecognizerTuple[];
    cssProps: Required<Pick<CssProps, 'userSelect' | 'touchSelect' | 'touchCallout' | 'contentZooming' | 'userDrag' | 'tapHighlightColor'>> & CssProps;
}

export interface HammerManager {
    options: HammerDefaults;
    element: HTMLElement | SVGElement | EventTarget | null;
    input: HammerInputInstance;
    touchAction: TouchAction;
    recognizers: Recognizer[];
    session: { [key: string]: any };

    set(options: HammerOptions): this;
    stop(force?: boolean): void;
    recognize(inputData: any): void;
    get(recognizer: Recognizer | string): Recognizer | null;
    add(recognizer: Recognizer): Recognizer;
    add(recognizers: Recognizer[]): this;
    remove(recognizer: Recognizer | Recognizer[] | string): this;
    on(events: string, handler: HammerListener): this;
    off(events: string, handler?: HammerListener): this;
    emit(event: string, data: any): void;
    destroy(): void;
}

export interface HammerManagerConstructor {
    new (element: EventTarget, options?: HammerOptions): HammerManager;
}

export interface HammerStatic {
    new (element: HTMLElement | SVGElement, options?: HammerOptions): HammerManager;
    (element: HTMLElement | SVGElement, options?: HammerOptions): HammerManager;

    VERSION: string;
    defaults: HammerDefaults;

    INPUT_START: 1;
    INPUT_MOVE: 2;
    INPUT_END: 4;
    INPUT_CANCEL: 8;

    STATE_POSSIBLE: 1;
    STATE_BEGAN: 2;
    STATE_CHANGED: 4;
    STATE_ENDED: 8;
    STATE_RECOGNIZED: 8;
    STATE_CANCELLED: 16;
    STATE_FAILED: 32;

    DIRECTION_NONE: 1;
    DIRECTION_LEFT: 2;
    DIRECTION_RIGHT: 4;
    DIRECTION_UP: 8;
    DIRECTION_DOWN: 16;
    DIRECTION_HORIZONTAL: 6;
    DIRECTION_VERTICAL: 24;
    DIRECTION_ALL: 30;

    Manager: HammerManagerConstructor;
    Input: HammerInputConstructor;
    TouchAction: TouchActionConstructor;

    TouchInput: HammerInputConstructor;
    MouseInput: HammerInputConstructor;
    PointerEventInput: HammerInputConstructor;
    TouchMouseInput: HammerInputConstructor;
    SingleTouchInput: HammerInputConstructor;

    Recognizer: RecognizerStatic;
    AttrRecognizer: RecognizerStatic<AttrRecognizer>;
    Tap: RecognizerStatic<TapRecognizer>;
    Pan: RecognizerStatic<PanRecognizer>;
    Swipe: RecognizerStatic<SwipeRecognizer>;
    Pinch: RecognizerStatic<PinchRecognizer>;
    Rotate: RecognizerStatic<RotateRecognizer>;
    Press: RecognizerStatic<PressRecognizer>;

    on(target: EventTarget, types: string, handler: EventListenerOrEventListenerObject): void;
    off(target: EventTarget, types: string, handler: EventListenerOrEventListenerObject): void;
    each(obj: any, iterator: (value: any, key: any, obj: any) => void, context?: any): void;
    merge<T extends object, U extends object>(dest: T, src: U): T & U;
    extend<T extends object, U extends object>(dest: T, src: U, merge?: boolean): T & U;
    assign<T extends object>(target: T, ...sources: any[]): T;
    inherit(child: Function, base: Function, properties?: { [key: string]: any }): void;
    bindFn<T extends Function>(fn: T, context: any): T;
    prefixed(obj: any, property?: string): string | undefined;
}

declare const Hammer: HammerStatic;

export default Hammer;
export as namespace Hammer;

export const VERSION: HammerStatic['VERSION'];
export const defaults: HammerStatic['defaults'];
export const INPUT_START: HammerStatic['INPUT_START'];
export const INPUT_MOVE: HammerStatic['INPUT_MOVE'];
export const INPUT_END: HammerStatic['INPUT_END'];
export const INPUT_CANCEL: HammerStatic['INPUT_CANCEL'];
export const STATE_POSSIBLE: HammerStatic['STATE_POSSIBLE'];
export const STATE_BEGAN: HammerStatic['STATE_BEGAN'];
export const STATE_CHANGED: HammerStatic['STATE_CHANGED'];
export const STATE_ENDED: HammerStatic['STATE_ENDED'];
export const STATE_RECOGNIZED: HammerStatic['STATE_RECOGNIZED'];
export const STATE_CANCELLED: HammerStatic['STATE_CANCELLED'];
export const STATE_FAILED: HammerStatic['STATE_FAILED'];
export const DIRECTION_NONE: HammerStatic['DIRECTION_NONE'];
export const DIRECTION_LEFT: HammerStatic['DIRECTION_LEFT'];
export const DIRECTION_RIGHT: HammerStatic['DIRECTION_RIGHT'];
export const DIRECTION_UP: HammerStatic['DIRECTION_UP'];
export const DIRECTION_DOWN: HammerStatic['DIRECTION_DOWN'];
export const DIRECTION_HORIZONTAL: HammerStatic['DIRECTION_HORIZONTAL'];
export const DIRECTION_VERTICAL: HammerStatic['DIRECTION_VERTICAL'];
export const DIRECTION_ALL: HammerStatic['DIRECTION_ALL'];
export const Manager: HammerStatic['Manager'];
export const Input: HammerStatic['Input'];
export const TouchAction: HammerStatic['TouchAction'];
export const TouchInput: HammerStatic['TouchInput'];
export const MouseInput: HammerStatic['MouseInput'];
export const PointerEventInput: HammerStatic['PointerEventInput'];
export const TouchMouseInput: HammerStatic['TouchMouseInput'];
export const SingleTouchInput: HammerStatic['SingleTouchInput'];
export const Recognizer: HammerStatic['Recognizer'];
export const AttrRecognizer: HammerStatic['AttrRecognizer'];
export const Tap: HammerStatic['Tap'];
export const Pan: HammerStatic['Pan'];
export const Swipe: HammerStatic['Swipe'];
export const Pinch: HammerStatic['Pinch'];
export const Rotate: HammerStatic['Rotate'];
export const Press: HammerStatic['Press'];
export const on: HammerStatic['on'];
export const off: HammerStatic['off'];
export const each: HammerStatic['each'];
export const merge: HammerStatic['merge'];
export const extend: HammerStatic['extend'];
export const assign: HammerStatic['assign'];
export const inherit: HammerStatic['inherit'];
export const bindFn: HammerStatic['bindFn'];
export const prefixed: HammerStatic['prefixed'];
