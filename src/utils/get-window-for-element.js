/**
 * @private
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
export default function getWindowForElement(element) {
  let doc = element.ownerDocument || element;
  return (doc.defaultView || doc.parentWindow || window);
}
