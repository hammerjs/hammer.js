/**
 * Configuration options for native touch behaviors.
 * All properties are optional and default to `false` (preventing nothing).
 * `true` means the default browser behavior will be prevented.
 */
export interface TouchBehavior {
  // Prevent the browser from handling scrolling?
  preventScrollX?: boolean;
  preventScrollY?: boolean;
  // Prevent pinch-to-zoom on this element?
  preventZoom?: boolean;
  // Prevent the user from selecting text or images on this element?
  preventSelect?: boolean;
  // Prevent the native context menu (long press) from appearing?
  preventContextMenu?: boolean;
}

/**
 * Applies CSS properties and event listeners to an element based on the given touch behavior configuration.
 * Returns a function to remove any added event listeners.
 */
export function setTouchBehavior(element: HTMLElement, options: TouchBehavior): () => void {
  const removeTouchAction = setTouchActionRule(element, options);
  const removeUserSelect = setUserSelectRule(element, !!options.preventSelect);
  const removeEventListener = setContextMenuListener(element, !!options.preventContextMenu);
  return () => {
    removeTouchAction();
    removeUserSelect();
    removeEventListener();
  };
}

function setTouchActionRule(element: HTMLElement, o: TouchBehavior): () => void {
  let touchAction = 'auto';
  if (o.preventScrollX && o.preventScrollY) {
    // Disallow ALL browser scrolling (e.g. Game Canvas)
    touchAction = 'none';
  } else if (o.preventScrollX && !o.preventScrollY) {
    // Disallow X (allow Y). Browser handles vertical, we handle horizontal.
    touchAction = 'pan-y';
  } else if (!o.preventScrollX && o.preventScrollY) {
    // Disallow Y (allow X). Browser handles horizontal, we handle vertical.
    touchAction = 'pan-x';
  } else if (o.preventZoom) {
    // 'manipulation' allows panning but disables double-tap-to-zoom
    touchAction = 'manipulation';
  }
  element.style.setProperty('touch-action', touchAction);
  return () => {
    element.style.removeProperty('touch-action');
  };
}

function setUserSelectRule(element: HTMLElement, prevent: boolean): () => void {
  if (!prevent) {
    return () => {};
  }
  element.style.setProperty('user-select', 'none');
  element.style.setProperty('-webkit-user-select', 'none');
  element.style.setProperty('-webkit-touch-callout', 'none');
  return () => {
    element.style.removeProperty('user-select');
    element.style.removeProperty('-webkit-user-select');
    element.style.removeProperty('-webkit-touch-callout');
  };
}

// Prevent the context menu from appearing on long-press if not allowed.
function setContextMenuListener(element: HTMLElement, prevent: boolean): () => void {
  if (!prevent) {
    return () => {};
  }
  const handler = (e: Event) => {
    e.preventDefault();
  };
  element.addEventListener('contextmenu', handler);
  return () => {
    element.removeEventListener('contextmenu', handler);
  };
}
