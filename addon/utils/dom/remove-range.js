export default function removeRange(firstNode, lastNode) {
  let node = lastNode;

  do {
    let next = node.previousSibling;

    if (node.parentNode) {
      node.parentNode.removeChild(node);
      if (node === firstNode) {
        break;
      }
    }
    node = next;
  } while (node);
}
