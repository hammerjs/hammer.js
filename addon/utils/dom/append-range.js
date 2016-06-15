export default function appendRange(element, firstNode, lastNode) {
  const currentActiveElement = document.activeElement;
  let referenceNode = element.lastChild || element.lastNode;
  let parentNode = referenceNode ? referenceNode.parentNode : element;
  let nextNode;

  while (firstNode) {
    nextNode = firstNode.nextSibling;
    parentNode.insertBefore(firstNode, referenceNode);
    firstNode = firstNode !== lastNode ? nextNode : null;
  }

  // reset focus
  if (document.activeElement !== currentActiveElement) {
    currentActiveElement.focus();
  }
};
