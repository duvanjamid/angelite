/**
 * Virtual DOM implementation for Lagunlar
 * Lightweight virtual DOM implementation
 */

/**
 * VNode class represents a virtual DOM node
 */
export class VNode {
  constructor(type, props, key, ref) {
    this.type = type;
    this.props = props || {};
    this.key = key;
    this.ref = ref;
    this.children = this.props.children || [];
  }
}

/**
 * Creates a virtual DOM element
 * 
 * @param {string|Function} type - Element type or component constructor
 * @param {Object} props - Element properties
 * @param {...VNode|string} children - Child elements
 * @returns {VNode} Virtual DOM node
 */
export function createElement(type, props, ...children) {
  props = props || {};
  
  // Extract key and ref from props
  let key = props.key || null;
  let ref = props.ref || null;
  
  // Remove key and ref from props
  if (props.key) delete props.key;
  if (props.ref) delete props.ref;
  
  // Flatten children array and filter out falsy values
  children = children.flat().filter(child => child !== null && child !== undefined && child !== false);
  
  // Convert primitive children to text nodes
  children = children.map(child => 
    typeof child === 'string' || typeof child === 'number' 
      ? createTextVNode(child) 
      : child
  );
  
  props.children = children;
  
  return new VNode(type, props, key, ref);
}

/**
 * Creates a text VNode
 * 
 * @param {string|number} text - Text content
 * @returns {VNode} Text virtual node
 */
export function createTextVNode(text) {
  return new VNode('#text', { nodeValue: String(text) });
}

/**
 * Compares two VNodes to determine if they are the same node
 * Used for efficient diffing
 * 
 * @param {VNode} a - First VNode
 * @param {VNode} b - Second VNode
 * @returns {boolean} Whether the nodes are the same
 */
export function isSameVNode(a, b) {
  return a.key === b.key && a.type === b.type;
}

/**
 * Clones a VNode with new props
 * 
 * @param {VNode} vnode - VNode to clone
 * @param {Object} props - New props to apply
 * @returns {VNode} Cloned VNode
 */
export function cloneVNode(vnode, props) {
  return new VNode(
    vnode.type,
    { ...vnode.props, ...props },
    vnode.key,
    vnode.ref
  );
}
