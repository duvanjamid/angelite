/**
 * Directive processor for Lagunlar
 * Handles applying directives to DOM elements
 */

// Registry of available directives
const directiveRegistry = new Map();

/**
 * Register a directive
 * 
 * @param {string} selector - Directive selector
 * @param {Function} DirectiveClass - Directive class
 */
export function registerDirective(selector, DirectiveClass) {
  directiveRegistry.set(selector, DirectiveClass);
}

/**
 * Comprueba si un selector es una directiva moderna (con @)
 * 
 * @param {string} selector - Selector a comprobar
 * @returns {boolean} True si es una directiva moderna
 */
function isModernDirective(selector) {
  return selector.startsWith('@');
}

/**
 * Apply directives to a DOM element
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
export function applyDirectives(element, context) {
  // Process element directives
  processElementDirectives(element, context);
  
  // Process modern directives (@if, @for, etc)
  processModernDirectives(element, context);
  
  // Process structural directives (*ngIf, *ngFor) - Legacy support
  processStructuralDirectives(element, context);
  
  // Process attribute directives ([property], (event))
  processAttributeDirectives(element, context);
  
  // Process two-way binding ([(ngModel)])
  processTwoWayBinding(element, context);
  
  // Process children recursively
  Array.from(element.children).forEach(child => {
    applyDirectives(child, context);
  });
}

/**
 * Process element directives (custom elements)
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
function processElementDirectives(element, context) {
  const tagName = element.tagName.toLowerCase();
  
  // Check if element matches any registered directive
  directiveRegistry.forEach((DirectiveClass, selector) => {
    if (selector.startsWith('element:') && tagName === selector.substring(8)) {
      applyDirective(element, DirectiveClass, context);
    }
  });
}

/**
 * Process modern directives (@if, @for, etc)
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
function processModernDirectives(element, context) {
  // Obtener todos los atributos del elemento
  const attributes = Array.from(element.attributes || []);
  
  // Buscar atributos que comiencen con @
  for (const attr of attributes) {
    if (attr.name.startsWith('@')) {
      const directiveName = attr.name;
      const DirectiveClass = directiveRegistry.get(directiveName);
      
      if (DirectiveClass) {
        try {
          // Crear instancia de la directiva
          const directive = new DirectiveClass();
          
          // Configurar la directiva
          directive.element = element;
          directive.context = context;
          
          // Evaluar la expresión de la directiva si existe
          const expression = attr.value;
          if (expression) {
            // Evaluar la expresión en el contexto del componente
            const result = evaluateExpression(expression, context);
            directive.value = result;
          }
          
          // Inicializar la directiva
          if (directive.ngOnInit) {
            directive.ngOnInit();
          }
          
          // Guardar la directiva en el elemento para referencia futura
          if (!element._directives) {
            element._directives = [];
          }
          element._directives.push(directive);
          
          console.log(`Directiva ${directiveName} aplicada con éxito`, directive);
        } catch (e) {
          console.error(`Error al procesar directiva ${directiveName}:`, e);
        }
      } else {
        console.warn(`Directiva no registrada: ${directiveName}`);
      }
    }
  }
}

/**
 * Process structural directives (*ngIf, *ngFor) - Legacy support
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
function processStructuralDirectives(element, context) {
  // Process *ngIf
  if (element.hasAttribute('*ngIf')) {
    const expression = element.getAttribute('*ngIf');
    const result = evaluateExpression(expression, context);
    
    if (!result) {
      // Hide element if condition is false
      element.style.display = 'none';
    }
    
    // Remove attribute to avoid reprocessing
    element.removeAttribute('*ngIf');
  }
  
  // Process *ngFor
  if (element.hasAttribute('*ngFor')) {
    const expression = element.getAttribute('*ngFor');
    processNgFor(element, expression, context);
    
    // Remove attribute to avoid reprocessing
    element.removeAttribute('*ngFor');
  }
}

/**
 * Process *ngFor directive
 * 
 * @param {HTMLElement} element - DOM element
 * @param {string} expression - ngFor expression (e.g., "let item of items")
 * @param {Object} context - Component context
 */
function processNgFor(element, expression, context) {
  // Parse "let item of items" syntax
  const match = expression.match(/let\s+(\w+)\s+of\s+(\w+)/);
  if (!match) return;
  
  const [, itemName, arrayName] = match;
  const array = evaluateExpression(arrayName, context);
  
  if (!Array.isArray(array)) return;
  
  // Store original template
  const template = element.outerHTML;
  const parent = element.parentNode;
  
  // Remove original element
  parent.removeChild(element);
  
  // Create container for items
  const container = document.createElement('div');
  container.style.display = 'contents'; // Make container invisible
  
  // Create elements for each item
  array.forEach((item, index) => {
    // Create temporary context with item and index
    const itemContext = {
      ...context,
      [itemName]: item,
      index
    };
    
    // Create new element from template
    const newElement = document.createElement('div');
    newElement.innerHTML = processInterpolation(template, itemContext);
    
    // Add to container
    Array.from(newElement.children).forEach(child => {
      container.appendChild(child);
      
      // Process directives on the new element
      applyDirectives(child, itemContext);
    });
  });
  
  // Insert container into DOM
  parent.appendChild(container);
}

/**
 * Process attribute directives ([property], (event))
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
function processAttributeDirectives(element, context) {
  // Process property bindings [property]="expression"
  Array.from(element.attributes).forEach(attr => {
    const name = attr.name;
    const value = attr.value;
    
    // Property binding
    if (name.startsWith('[') && name.endsWith(']')) {
      const propName = name.substring(1, name.length - 1);
      const propValue = evaluateExpression(value, context);
      
      // Set property
      element[propName] = propValue;
      
      // Remove attribute to avoid reprocessing
      element.removeAttribute(name);
    }
    
    // Event binding
    if (name.startsWith('(') && name.endsWith(')')) {
      const eventName = name.substring(1, name.length - 1);
      const handlerName = value;
      
      // Add event listener
      element.addEventListener(eventName, (event) => {
        if (typeof context[handlerName] === 'function') {
          context[handlerName](event);
        }
      });
      
      // Remove attribute to avoid reprocessing
      element.removeAttribute(name);
    }
  });
}

/**
 * Process two-way binding ([(ngModel)])
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Object} context - Component context
 */
function processTwoWayBinding(element, context) {
  // Process [(ngModel)]="property"
  if (element.hasAttribute('[(ngModel)]')) {
    const property = element.getAttribute('[(ngModel)]');
    
    // Set initial value
    element.value = context[property] || '';
    
    // Add input event listener
    element.addEventListener('input', (event) => {
      context[property] = event.target.value;
    });
    
    // Remove attribute to avoid reprocessing
    element.removeAttribute('[(ngModel)]');
  }
}

/**
 * Apply a directive to an element
 * 
 * @param {HTMLElement} element - DOM element
 * @param {Function} DirectiveClass - Directive class
 * @param {Object} context - Component context
 */
function applyDirective(element, DirectiveClass, context) {
  // Create directive instance
  const directive = new DirectiveClass();
  
  // Set element and context
  directive.element = element;
  directive.context = context;
  
  // Call lifecycle hooks
  if (directive.ngOnInit) {
    directive.ngOnInit();
  }
}

/**
 * Process interpolation in templates ({{ expression }})
 * 
 * @param {string} template - Template string
 * @param {Object} context - Component context
 * @returns {string} Processed template
 */
function processInterpolation(template, context) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
    try {
      return evaluateExpression(expr.trim(), context);
    } catch (e) {
      console.error('Error evaluating expression:', expr, e);
      return '';
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
