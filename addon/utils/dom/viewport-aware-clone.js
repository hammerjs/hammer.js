function isInViewport(element, viewport) {
  let client = element.getBoundingClientRect();
  debugger;

  return true;
}

function cloneElement(parent, element, viewport) {
  parent.appendChild(element.cloneNode(true));
}


export default function viewportAwareClone(tagName, firstNode, lastNode) {
  const parent = document.createElement(tagName);
  let nextNode;
  let viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  while (firstNode) {
    nextNode = firstNode.nextSibling;
    if (isInViewport(firstNode, viewport)) {
      cloneElement(parent, firstNode, viewport);
    } else {
      break;
    }
    firstNode = firstNode !== lastNode ? nextNode : null;
  }

  return parent;
};
