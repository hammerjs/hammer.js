export default function cloneRange(tagName, firstNode, lastNode) {
  const parent = document.createElement(tagName);
  let nextNode;

  while (firstNode) {
    nextNode = firstNode.nextSibling;
    parent.appendChild(firstNode.cloneNode(true));
    firstNode = firstNode !== lastNode ? nextNode : null;
  }

  return parent;
};
