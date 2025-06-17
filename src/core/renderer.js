/**
 * Renderer for Lagunlar
 * Handles virtual DOM diffing and real DOM updates
 */

import { isSameVNode } from './vdom.js';
import { applyDirectives } from '../directives/directive-processor.js';
import { markDirty, initChangeDetection } from './change-detection.js';
import { applyInputsToComponent, connectOutputsToParent } from '../decorators/input-output.js';
import { processPipeExpression, getRegisteredPipes } from '../pipes/pipe.js';
import { registerBuiltInPipes } from '../pipes/built-in-pipes.js';

// Registrar los pipes incorporados y verificar que se han registrado correctamente
registerBuiltInPipes();

// Verificar que los pipes se han registrado correctamente
console.log('Pipes registrados en el sistema:', getRegisteredPipes());

// Inicializar el sistema de detección de cambios
initChangeDetection();

/**
 * Renders a virtual DOM tree to a real DOM container
 * 
 * @param {VNode} vnode - Virtual DOM node to render
 * @param {HTMLElement} container - DOM element to render into
 * @param {HTMLElement} oldDom - Previous DOM node (for replacement)
 * @returns {HTMLElement} The created DOM node
 */
export function render(vnode, container, oldDom = null) {
  const dom = diff(oldDom, vnode, container);
  
  if (!oldDom && dom) {
    container.appendChild(dom);
  }
  
  return dom;
}

/**
 * Diff algorithm to update the DOM efficiently
 * 
 * @param {HTMLElement} oldDom - Current DOM node
 * @param {VNode} vnode - New virtual node
 * @param {HTMLElement} parentDom - Parent DOM element
 * @returns {HTMLElement} Updated DOM node
 */
function diff(oldDom, vnode, parentDom) {
  // Handle null or undefined vnode
  if (vnode === null || vnode === undefined) {
    if (oldDom) {
      parentDom.removeChild(oldDom);
    }
    return null;
  }
  
  // Get the type of the virtual node
  const { type } = vnode;
  
  // Handle component types
  if (typeof type === 'function') {
    return diffComponent(oldDom, vnode, parentDom);
  }
  
  // Handle text nodes
  if (type === '#text') {
    return diffText(oldDom, vnode);
  }
  
  // Handle DOM elements
  if (!oldDom) {
    // Create new DOM node if none exists
    return createDomElement(vnode);
  } else if (oldDom.nodeName.toLowerCase() !== type.toLowerCase()) {
    // Replace DOM node if type has changed
    const newDom = createDomElement(vnode);
    if (parentDom) {
      parentDom.replaceChild(newDom, oldDom);
    }
    return newDom;
  } else {
    // Update existing DOM node
    updateDomElement(oldDom, vnode);
    
    // Recursively diff children
    diffChildren(oldDom, vnode);
    
    return oldDom;
  }
}

/**
 * Diff and update component nodes
 * 
 * @param {HTMLElement} oldDom - Current DOM node
 * @param {VNode} vnode - New virtual node
 * @param {HTMLElement} parentDom - Parent DOM element
 * @returns {HTMLElement} Updated DOM node
 */
function diffComponent(oldDom, vnode, parentDom) {
  const { type: Component, props } = vnode;
  let instance;
  
  // Check if this is an existing component instance
  if (oldDom && oldDom._component && oldDom._component.constructor === Component) {
    instance = oldDom._component;
    // Update component props
    instance.props = props;
    // Call lifecycle hook if available
    if (instance.componentWillUpdate) {
      instance.componentWillUpdate(props);
    }
  } else {
    // Create new component instance
    instance = new Component(props);
    instance.props = props;
    
    // Call lifecycle hook if available
    if (instance.componentWillMount) {
      instance.componentWillMount();
    }
    
    // Handle component with Angular-like template
    if (Component._template) {
      instance._selector = Component._selector;
      instance._template = Component._template;
      instance._styles = Component._styles;
    }
  }
  
  // Aplicar inputs desde las props al componente
  applyInputsToComponent(instance, props);
  
  // Conectar outputs del componente a los handlers en las props
  connectOutputsToParent(instance, props);
  
  // Render component
  let renderedVNode;
  
  if (instance.render) {
    // Component render method
    renderedVNode = instance.render();
  } else if (instance._template) {
    // Angular-like template rendering
    renderedVNode = processTemplate(instance._template, instance);
  } else {
    throw new Error('Component must have either a render method or a template');
  }
  
  // Diff the rendered content
  const newDom = diff(oldDom, renderedVNode, parentDom);
  
  // Store component instance on DOM node
  if (newDom) {
    newDom._component = instance;
    
    // Agregar método de actualización de vista al componente
    instance._updateView = function() {
      const renderedVNode = instance.render ? instance.render() : processTemplate(instance._template, instance);
      diff(newDom, renderedVNode, parentDom);
    };
    
    // Call lifecycle hook if available
    if (instance.componentDidMount && !oldDom) {
      instance.componentDidMount();
    } else if (instance.componentDidUpdate && oldDom) {
      instance.componentDidUpdate();
    }
    
    // Call Angular-like ngOnInit if available
    if (instance.ngOnInit && !oldDom) {
      instance.ngOnInit();
    }
  }
  
  return newDom;
}

/**
 * Process an Angular-like template string into a VNode
 * 
 * @param {string} template - Template string
 * @param {Object} context - Component instance
 * @returns {VNode} Processed template as VNode
 */
function processTemplate(template, context) {
  // Create a temporary container
  const div = document.createElement('div');
  
  // Process interpolation and directives
  template = processInterpolation(template, context);
  
  // Set processed HTML
  div.innerHTML = template;
  
  // Process directives on the created DOM
  applyDirectives(div, context);
  
  // Return the first child as a VNode
  // In a real implementation, this would convert the DOM to VNodes
  return {
    type: div.firstChild.nodeName.toLowerCase(),
    props: getElementProps(div.firstChild),
    children: Array.from(div.firstChild.childNodes).map(childToVNode)
  };
}

/**
 * Process interpolation in templates ({{ expression }})
 * 
 * @param {string} template - Template string
 * @param {Object} context - Component instance
 * @returns {string} Processed template
 */
function processInterpolation(template, context) {
  // Solución directa para pipes: reemplazar las expresiones con pipes por sus valores formateados
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
    try {
      // Verificar si la expresión contiene pipes
      if (expr.includes('|')) {
        // Dividir la expresión por el operador de pipe |
        const parts = expr.split('|').map(part => part.trim());
        const baseExpr = parts[0];
        
        // Evaluar la expresión base
        let value = evaluateExpression(baseExpr, context);
        
        // Aplicar cada pipe en secuencia
        for (let i = 1; i < parts.length; i++) {
          const pipePart = parts[i];
          const pipeSegments = pipePart.split(':');
          const pipeName = pipeSegments[0].trim();
          const args = pipeSegments.slice(1).map(arg => {
            // Extraer argumentos (quitar comillas si es necesario)
            if ((arg.startsWith("'") && arg.endsWith("'")) || 
                (arg.startsWith('"') && arg.endsWith('"'))) {
              return arg.substring(1, arg.length - 1);
            }
            return arg.trim();
          });
          
          // Aplicar el pipe directamente según su tipo
          switch (pipeName) {
            case 'uppercase':
              value = String(value).toUpperCase();
              break;
              
            case 'lowercase':
              value = String(value).toLowerCase();
              break;
              
            case 'titlecase':
              value = String(value).replace(/\w\S*/g, txt => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
              break;
              
            case 'date':
              if (value instanceof Date) {
                if (args.includes('full')) {
                  value = value.toLocaleString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric'
                  });
                } else {
                  value = value.toLocaleString();
                }
              } else if (value) {
                value = new Date(value).toLocaleString();
              }
              break;
              
            case 'currency':
              try {
                const currency = args[0] || 'USD';
                value = new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: currency
                }).format(Number(value));
              } catch (e) {
                console.error('Error en pipe currency:', e);
              }
              break;
              
            case 'number':
              try {
                value = new Intl.NumberFormat().format(Number(value));
              } catch (e) {
                console.error('Error en pipe number:', e);
              }
              break;
              
            case 'percent':
              try {
                value = new Intl.NumberFormat(undefined, {
                  style: 'percent',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(Number(value));
              } catch (e) {
                console.error('Error en pipe percent:', e);
              }
              break;
              
            case 'json':
              try {
                value = JSON.stringify(value, null, 2);
              } catch (e) {
                console.error('Error en pipe json:', e);
              }
              break;
          }
        }
        
        // Asegurarse de que el resultado sea una cadena
        return value !== undefined && value !== null ? value.toString() : '';
      } else {
        // Evaluar expresión simple
        const result = evaluateExpression(expr.trim(), context);
        
        // Asegurarse de que el resultado sea una cadena
        return result !== undefined && result !== null ? result.toString() : '';
      }
    } catch (e) {
      console.error('Error evaluando expresión:', expr, e);
      return match; // Devolver la expresión original en caso de error para facilitar la depuración
    }
  });
}

/**
 * Evaluate an expression in the given context
 * 
 * @param {string} expr - Expression to evaluate
 * @param {Object} context - Context object
 * @returns {*} Evaluated result
 */
function evaluateExpression(expr, context) {
  // Handle property access with dot notation
  if (expr.includes('.')) {
    const parts = expr.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return '';
      value = value[part];
      
      // Handle function calls
      if (typeof value === 'function') {
        value = value.call(context);
      }
    }
    
    return value;
  }
  
  // Handle simple property access
  return context[expr];
}

/**
 * Convert a DOM node to a VNode
 * 
 * @param {Node} node - DOM node
 * @returns {VNode} Equivalent VNode
 */
function childToVNode(node) {
  if (node.nodeType === 3) { // Text node
    return {
      type: '#text',
      props: { nodeValue: node.nodeValue }
    };
  } else { // Element node
    return {
      type: node.nodeName.toLowerCase(),
      props: getElementProps(node),
      children: Array.from(node.childNodes).map(childToVNode)
    };
  }
}

/**
 * Get props from a DOM element
 * 
 * @param {Element} element - DOM element
 * @returns {Object} Props object
 */
function getElementProps(element) {
  const props = {};
  
  // Copy attributes
  Array.from(element.attributes).forEach(attr => {
    let name = attr.name;
    
    // Convert Angular-like event bindings
    if (name.startsWith('(') && name.endsWith(')')) {
      name = `on${name.slice(1, -1)}`;
    }
    
    props[name] = attr.value;
  });
  
  return props;
}

/**
 * Diff and update text nodes
 * 
 * @param {Node} oldDom - Current DOM node
 * @param {VNode} vnode - New virtual node
 * @returns {Node} Updated text node
 */
function diffText(oldDom, vnode) {
  if (!oldDom || oldDom.nodeType !== 3) {
    const newDom = document.createTextNode(vnode.props.nodeValue);
    if (oldDom && oldDom.parentNode) {
      oldDom.parentNode.replaceChild(newDom, oldDom);
    }
    return newDom;
  }
  
  // Update text content if needed
  if (oldDom.nodeValue !== vnode.props.nodeValue) {
    oldDom.nodeValue = vnode.props.nodeValue;
  }
  
  return oldDom;
}

/**
 * Create a new DOM element from a VNode
 * 
 * @param {VNode} vnode - Virtual DOM node
 * @returns {HTMLElement} Created DOM element
 */
function createDomElement(vnode) {
  const { type, props } = vnode;
  
  // Create text node
  if (type === '#text') {
    return document.createTextNode(props.nodeValue);
  }
  
  // Create element
  const dom = document.createElement(type);
  
  // Set attributes and event listeners
  updateDomProperties(dom, {}, props);
  
  // Append children
  if (props.children) {
    props.children.forEach(child => {
      const childDom = diff(null, child, dom);
      if (childDom) {
        dom.appendChild(childDom);
      }
    });
  }
  
  return dom;
}

/**
 * Update an existing DOM element with new props
 * 
 * @param {HTMLElement} dom - DOM element to update
 * @param {VNode} vnode - New virtual node
 */
function updateDomElement(dom, vnode) {
  const oldProps = dom._props || {};
  const newProps = vnode.props;
  
  // Save new props for future updates
  dom._props = { ...newProps };
  
  // Update properties
  updateDomProperties(dom, oldProps, newProps);
}

/**
 * Update DOM properties (attributes, event listeners)
 * 
 * @param {HTMLElement} dom - DOM element to update
 * @param {Object} oldProps - Previous props
 * @param {Object} newProps - New props
 */
function updateDomProperties(dom, oldProps, newProps) {
  // Remove old properties
  for (const name in oldProps) {
    if (!(name in newProps) && name !== 'children') {
      if (name.startsWith('on')) {
        // Remove event listener
        const eventName = name.toLowerCase().substring(2);
        dom.removeEventListener(eventName, oldProps[name]);
      } else {
        // Remove attribute
        dom.removeAttribute(name);
      }
    }
  }
  
  // Set new properties
  for (const name in newProps) {
    if (name !== 'children' && oldProps[name] !== newProps[name]) {
      if (name.startsWith('on') && typeof newProps[name] === 'function') {
        // Add event listener
        const eventName = name.toLowerCase().substring(2);
        if (oldProps[name]) {
          dom.removeEventListener(eventName, oldProps[name]);
        }
        dom.addEventListener(eventName, newProps[name]);
      } else if (name === 'style' && typeof newProps[name] === 'object') {
        // Handle style objects
        const styleObj = newProps[name];
        for (const key in styleObj) {
          dom.style[key] = styleObj[key];
        }
      } else if (name !== 'list' && name !== 'form' && name in dom) {
        // Set property for known DOM properties
        dom[name] = newProps[name] || '';
      } else {
        // Set attribute for other properties
        dom.setAttribute(name, newProps[name]);
      }
    }
  }
}

/**
 * Diff and update children of a DOM element
 * 
 * @param {HTMLElement} dom - Parent DOM element
 * @param {VNode} vnode - New virtual node
 */
function diffChildren(dom, vnode) {
  const domChildren = Array.from(dom.childNodes);
  const vnodeChildren = vnode.props.children || [];
  const childrenLen = Math.max(domChildren.length, vnodeChildren.length);
  
  // Update or create each child
  for (let i = 0; i < childrenLen; i++) {
    const childVNode = i < vnodeChildren.length ? vnodeChildren[i] : null;
    const childDom = i < domChildren.length ? domChildren[i] : null;
    
    // Recursively diff child
    diff(childDom, childVNode, dom);
  }
}
