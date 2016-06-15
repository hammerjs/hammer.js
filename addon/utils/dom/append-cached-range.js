export default function appendCachedRange(element, range) {
  const currentActiveElement = document.activeElement;
  let referenceNode = element.lastChild || element.lastNode;
  let parentNode = referenceNode ? referenceNode.parentNode : element;

  for (let i = 0; i < range.length; i++) {
    parentNode.insertBefore(range[i], referenceNode);
  }

  // reset focus
  if (document.activeElement !== currentActiveElement) {
    currentActiveElement.focus();
  }
};
