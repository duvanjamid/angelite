/**
 * Directivas estructurales modernas para Lagunlar
 * Implementa la sintaxis @ similar a Angular 20
 */

import { registerDirective } from './directive-processor.js';

/**
 * @if - Directiva condicional moderna
 * Uso: <div @if="condition">Contenido</div>
 */
class IfDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.comment = null;
    this.template = null;
    this.elseTemplate = null;
    this.elseElement = null;
  }
  
  ngOnInit() {
    // Almacenar la plantilla original
    this.template = this.element.outerHTML;
    
    // Obtener la expresión de condición
    const condition = this.element.getAttribute('@if');
    
    // Buscar el elemento @else asociado
    this.findElseElement();
    
    // Evaluar la condición
    const result = this.evaluateExpression(condition);
    
    if (!result) {
      // Reemplazar el elemento con un comentario marcador
      this.comment = document.createComment(`@if: ${condition}`);
      this.element.parentNode.replaceChild(this.comment, this.element);
      
      // Mostrar el elemento @else si existe
      if (this.elseElement) {
        this.showElseElement();
      }
    } else if (this.elseElement) {
      // Ocultar el elemento @else
      this.hideElseElement();
    }
  }
  
  findElseElement() {
    // Buscar el siguiente elemento con @else
    let nextElement = this.element.nextElementSibling;
    while (nextElement) {
      if (nextElement.hasAttribute('@else')) {
        this.elseElement = nextElement;
        this.elseTemplate = nextElement.outerHTML;
        
        // Ocultar el elemento @else inicialmente
        this.hideElseElement();
        break;
      }
      nextElement = nextElement.nextElementSibling;
    }
  }
  
  showElseElement() {
    if (this.elseElement && this.elseElement._hidden) {
      // Restaurar el elemento @else
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.elseTemplate;
      const newElseElement = tempDiv.firstElementChild;
      
      // Reemplazar el comentario con el elemento @else
      if (this.elseElement._comment) {
        this.elseElement._comment.parentNode.replaceChild(newElseElement, this.elseElement._comment);
        this.elseElement = newElseElement;
        this.elseElement._hidden = false;
      }
    }
  }
  
  hideElseElement() {
    if (this.elseElement && !this.elseElement._hidden) {
      // Reemplazar el elemento @else con un comentario
      const comment = document.createComment('@else');
      this.elseElement.parentNode.replaceChild(comment, this.elseElement);
      
      // Guardar referencia al comentario
      this.elseElement._comment = comment;
      this.elseElement._hidden = true;
    }
  }
  
  evaluateExpression(expr) {
    try {
      // Evaluación simple para demostración
      if (expr.includes('.')) {
        const parts = expr.split('.');
        let value = this.context;
        
        for (const part of parts) {
          if (value === null || value === undefined) return false;
          value = value[part];
        }
        
        return Boolean(value);
      }
      
      return Boolean(this.context[expr]);
    } catch (e) {
      console.error('Error evaluando expresión:', expr, e);
      return false;
    }
  }
}

/**
 * @else - Directiva complementaria para @if
 * Uso: <div @else>Contenido alternativo</div>
 */
class ElseDirective {
  constructor() {
    this.element = null;
    this.context = null;
  }
  
  ngOnInit() {
    // La lógica principal se maneja en IfDirective
    // Este es solo un marcador
  }
}

/**
 * @for - Directiva de iteración moderna
 * Uso: <div @for="item of items; index as i">{{item}}</div>
 */
class ForDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.comment = null;
    this.template = null;
    this.container = null;
  }
  
  ngOnInit() {
    // Almacenar la plantilla original
    this.template = this.element.outerHTML;
    
    // Obtener la expresión
    const expression = this.element.getAttribute('@for');
    
    // Procesar @for
    this.processForDirective(expression);
  }
  
  processForDirective(expression) {
    // Analizar la sintaxis "item of items; index as i"
    const mainParts = expression.split(';');
    const itemOfPart = mainParts[0].trim();
    
    // Extraer la parte "item of items"
    const match = itemOfPart.match(/(\w+)\s+of\s+(\w+)/);
    if (!match) return;
    
    const [, itemName, arrayName] = match;
    const array = this.context[arrayName];
    
    if (!Array.isArray(array)) return;
    
    // Extraer variables adicionales como "index as i"
    const variables = {};
    if (mainParts.length > 1) {
      mainParts.slice(1).forEach(part => {
        const varMatch = part.trim().match(/(\w+)\s+as\s+(\w+)/);
        if (varMatch) {
          const [, varType, varName] = varMatch;
          variables[varType] = varName;
        }
      });
    }
    
    // Crear contenedor
    this.container = document.createElement('div');
    this.container.style.display = 'contents'; // Hacer el contenedor invisible
    
    // Crear comentario marcador
    this.comment = document.createComment(`@for: ${expression}`);
    
    // Reemplazar el elemento original con el comentario
    const parent = this.element.parentNode;
    parent.replaceChild(this.comment, this.element);
    
    // Insertar el contenedor después del comentario
    if (this.comment.nextSibling) {
      parent.insertBefore(this.container, this.comment.nextSibling);
    } else {
      parent.appendChild(this.container);
    }
    
    // Eliminar el atributo @for de la plantilla
    const template = this.template.replace(/@for="[^"]*"/, '');
    
    // Crear elementos para cada item
    array.forEach((item, index) => {
      // Crear contexto con el item y variables adicionales
      const itemContext = { ...this.context };
      
      // Agregar el item con su nombre
      itemContext[itemName] = item;
      
      // Agregar variables adicionales
      if (variables.index) {
        itemContext[variables.index] = index;
      }
      
      if (variables.first) {
        itemContext[variables.first] = index === 0;
      }
      
      if (variables.last) {
        itemContext[variables.last] = index === array.length - 1;
      }
      
      if (variables.even) {
        itemContext[variables.even] = index % 2 === 0;
      }
      
      if (variables.odd) {
        itemContext[variables.odd] = index % 2 !== 0;
      }
      
      // Reemplazar variables en la plantilla
      let itemTemplate = template;
      
      // Reemplazar interpolaciones
      itemTemplate = this.processInterpolation(itemTemplate, itemContext);
      
      // Crear elemento desde la plantilla
      const div = document.createElement('div');
      div.innerHTML = itemTemplate;
      
      // Agregar al contenedor
      while (div.firstChild) {
        this.container.appendChild(div.firstChild);
      }
    });
  }
  
  processInterpolation(template, context) {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
      try {
        return this.evaluateExpression(expr.trim(), context);
      } catch (e) {
        console.error('Error evaluando expresión:', expr, e);
        return '';
      }
    });
  }
  
  evaluateExpression(expr, context) {
    // Manejar acceso a propiedades con notación de punto
    if (expr.includes('.')) {
      const parts = expr.split('.');
      let value = context;
      
      for (const part of parts) {
        if (value === null || value === undefined) return '';
        value = value[part];
      }
      
      return value;
    }
    
    // Manejar acceso simple a propiedades
    return context[expr];
  }
}

/**
 * @switch - Directiva de conmutación moderna
 * Uso: <div @switch="expression">...</div>
 */
class SwitchDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.value = null;
  }
  
  ngOnInit() {
    // Obtener la expresión switch
    const expression = this.element.getAttribute('@switch');
    
    // Evaluar la expresión
    this.value = this.evaluateExpression(expression);
    
    // Procesar los casos
    this.processCases();
  }
  
  processCases() {
    // Buscar todos los elementos case y default dentro del switch
    const caseElements = Array.from(this.element.querySelectorAll('[\\@case]'));
    const defaultElement = this.element.querySelector('[\\@default]');
    
    let matchFound = false;
    
    // Procesar cada caso
    caseElements.forEach(caseElement => {
      const caseValue = caseElement.getAttribute('@case');
      const isMatch = this.evaluateCase(caseValue);
      
      if (isMatch) {
        matchFound = true;
        // Mostrar este caso
        this.showElement(caseElement);
      } else {
        // Ocultar este caso
        this.hideElement(caseElement);
      }
    });
    
    // Procesar el caso default
    if (defaultElement) {
      if (matchFound) {
        this.hideElement(defaultElement);
      } else {
        this.showElement(defaultElement);
      }
    }
  }
  
  evaluateCase(caseValue) {
    // Comparar el valor del switch con el valor del caso
    try {
      // Si el caso es una expresión, evaluarla
      if (caseValue.startsWith('{{') && caseValue.endsWith('}}')) {
        const expr = caseValue.substring(2, caseValue.length - 2).trim();
        const caseResult = this.evaluateExpression(expr);
        return this.value === caseResult;
      }
      
      // Si el caso es un valor literal
      return this.value === caseValue;
    } catch (e) {
      console.error('Error evaluando caso:', caseValue, e);
      return false;
    }
  }
  
  showElement(element) {
    element.style.display = '';
  }
  
  hideElement(element) {
    element.style.display = 'none';
  }
  
  evaluateExpression(expr) {
    try {
      // Evaluación simple para demostración
      if (expr.includes('.')) {
        const parts = expr.split('.');
        let value = this.context;
        
        for (const part of parts) {
          if (value === null || value === undefined) return null;
          value = value[part];
        }
        
        return value;
      }
      
      return this.context[expr];
    } catch (e) {
      console.error('Error evaluando expresión:', expr, e);
      return null;
    }
  }
}

/**
 * @case - Directiva de caso para @switch
 * Uso: <div @case="value">Contenido</div>
 */
class CaseDirective {
  constructor() {
    this.element = null;
    this.context = null;
  }
  
  ngOnInit() {
    // La lógica principal se maneja en SwitchDirective
  }
}

/**
 * @default - Directiva de caso predeterminado para @switch
 * Uso: <div @default>Contenido predeterminado</div>
 */
class DefaultDirective {
  constructor() {
    this.element = null;
    this.context = null;
  }
  
  ngOnInit() {
    // La lógica principal se maneja en SwitchDirective
  }
}

/**
 * @defer - Directiva para carga diferida
 * Uso: <div @defer>Contenido cargado de forma diferida</div>
 */
class DeferDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.template = null;
    this.comment = null;
    this.loaded = false;
    this.observer = null;
  }
  
  ngOnInit() {
    // Almacenar la plantilla original
    this.template = this.element.innerHTML;
    
    // Vaciar el contenido
    const placeholder = this.element.getAttribute('@defer-placeholder');
    if (placeholder) {
      this.element.innerHTML = placeholder;
    } else {
      this.element.innerHTML = '<div style="min-height: 20px;"></div>';
    }
    
    // Configurar la carga diferida
    this.setupDeferredLoading();
  }
  
  setupDeferredLoading() {
    // Determinar el trigger para la carga
    const trigger = this.element.getAttribute('@defer-trigger') || 'viewport';
    
    switch (trigger) {
      case 'viewport':
        this.setupViewportTrigger();
        break;
      case 'idle':
        this.setupIdleTrigger();
        break;
      case 'timer':
        this.setupTimerTrigger();
        break;
      case 'interaction':
        this.setupInteractionTrigger();
        break;
      default:
        this.setupViewportTrigger();
    }
  }
  
  setupViewportTrigger() {
    // Usar IntersectionObserver para detectar cuando el elemento está en el viewport
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loaded) {
        this.loadContent();
      }
    }, { threshold: 0.1 });
    
    this.observer.observe(this.element);
  }
  
  setupIdleTrigger() {
    // Cargar cuando el navegador esté inactivo
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => this.loadContent());
    } else {
      setTimeout(() => this.loadContent(), 200);
    }
  }
  
  setupTimerTrigger() {
    // Cargar después de un tiempo específico
    const delay = parseInt(this.element.getAttribute('@defer-delay') || '1000', 10);
    setTimeout(() => this.loadContent(), delay);
  }
  
  setupInteractionTrigger() {
    // Cargar cuando el usuario interactúa con la página
    const events = ['click', 'mouseover', 'keydown', 'scroll', 'touchstart'];
    
    const handleInteraction = () => {
      this.loadContent();
      // Eliminar todos los event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
    
    // Agregar event listeners
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });
  }
  
  loadContent() {
    if (this.loaded) return;
    
    this.loaded = true;
    
    // Desconectar el observer si existe
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Mostrar el contenido cargado
    this.element.innerHTML = this.template;
    
    // Disparar evento de cargado
    const event = new CustomEvent('defer-loaded', {
      bubbles: true,
      detail: { element: this.element }
    });
    this.element.dispatchEvent(event);
  }
  
  ngOnDestroy() {
    // Limpiar el observer si existe
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Registrar las directivas
registerDirective('@if', IfDirective);
registerDirective('@else', ElseDirective);
registerDirective('@for', ForDirective);
registerDirective('@switch', SwitchDirective);
registerDirective('@case', CaseDirective);
registerDirective('@default', DefaultDirective);
registerDirective('@defer', DeferDirective);

// Exportar las directivas
export {
  IfDirective,
  ElseDirective,
  ForDirective,
  SwitchDirective,
  CaseDirective,
  DefaultDirective,
  DeferDirective
};
