export interface MockPointerInit {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  timeStamp?: number;
  pointerType?: string;
  button?: number;
  buttons?: number;
  ctrlKey?: boolean;
  pressure?: number;
  isPrimary?: boolean;
  coalescedEvents?: PointerEvent[];
}

export function pointerEvent(type: string, init: MockPointerInit = {}): PointerEvent {
  const ev = new Event(type, {bubbles: true, cancelable: true, composed: true}) as PointerEvent;
  Object.defineProperties(ev, {
    pointerId: {value: init.pointerId ?? 1},
    clientX: {value: init.clientX ?? 0},
    clientY: {value: init.clientY ?? 0},
    pointerType: {value: init.pointerType ?? 'touch'},
    button: {value: init.button ?? 0},
    ctrlKey: {value: init.ctrlKey ?? false},
    pressure: {value: init.pressure ?? 0.5},
    isPrimary: {value: init.isPrimary ?? false},
    ...(init.buttons !== undefined ? {buttons: {value: init.buttons}} : {}),
    ...(init.timeStamp !== undefined ? {timeStamp: {value: init.timeStamp}} : {}),
    ...(init.coalescedEvents ? {getCoalescedEvents: {value: () => init.coalescedEvents!}} : {}),
  });
  return ev;
}
