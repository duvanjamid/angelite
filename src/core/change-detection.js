/**
 * Sistema de detección de cambios para Lagunlar
 * Implementa un mecanismo automático para detectar y aplicar cambios en los componentes
 */

// Estrategias de detección de cambios
export const ChangeDetectionStrategy = {
  DEFAULT: 'default',  // Verifica todos los componentes en cada ciclo
  ON_PUSH: 'onPush'    // Solo verifica cuando las entradas cambian o hay eventos
};

// Almacena componentes que necesitan actualización
const dirtyComponents = new Set();

// Indica si hay un ciclo de detección de cambios en progreso
let changeDetectionInProgress = false;

// Indica si la detección de cambios está habilitada
let changeDetectionEnabled = true;

/**
 * Marca un componente como sucio (necesita actualización)
 * 
 * @param {Object} component - Instancia del componente
 */
export function markDirty(component) {
  if (!changeDetectionEnabled) return;
  
  dirtyComponents.add(component);
  scheduleChangeDetection();
}

/**
 * Programa un ciclo de detección de cambios
 */
function scheduleChangeDetection() {
  if (changeDetectionInProgress) return;
  
  changeDetectionInProgress = true;
  
  // Usa requestAnimationFrame para sincronizar con el ciclo de renderizado del navegador
  requestAnimationFrame(() => {
    runChangeDetection();
    changeDetectionInProgress = false;
  });
}

/**
 * Ejecuta un ciclo de detección de cambios
 */
function runChangeDetection() {
  // Copia los componentes sucios para evitar modificaciones durante la iteración
  const componentsToUpdate = Array.from(dirtyComponents);
  dirtyComponents.clear();
  
  // Actualiza cada componente
  componentsToUpdate.forEach(component => {
    if (shouldCheckComponent(component)) {
      updateComponent(component);
    }
  });
}

/**
 * Determina si un componente debe ser verificado basado en su estrategia
 * 
 * @param {Object} component - Instancia del componente
 * @returns {boolean} Si el componente debe ser verificado
 */
function shouldCheckComponent(component) {
  // Si la estrategia es OnPush, solo verifica si está marcado explícitamente
  if (component._changeDetectionStrategy === ChangeDetectionStrategy.ON_PUSH) {
    return component._forcedCheck || false;
  }
  
  // Para la estrategia Default, siempre verifica
  return true;
}

/**
 * Actualiza un componente y su vista
 * 
 * @param {Object} component - Instancia del componente
 */
function updateComponent(component) {
  // Resetea la bandera de verificación forzada
  if (component._forcedCheck) {
    component._forcedCheck = false;
  }
  
  // Llama al método de actualización del componente si existe
  if (typeof component.detectChanges === 'function') {
    component.detectChanges();
  }
  
  // Actualiza la vista del componente
  if (component._updateView) {
    component._updateView();
  }
}

/**
 * Fuerza la verificación de un componente OnPush
 * 
 * @param {Object} component - Instancia del componente
 */
export function detectChanges(component) {
  component._forcedCheck = true;
  markDirty(component);
}

/**
 * Verifica todos los componentes independientemente de su estrategia
 */
export function detectChangesInAll() {
  // Implementación para verificar todos los componentes registrados
  // Esto requiere un registro global de componentes
}

/**
 * Desactiva temporalmente la detección de cambios
 */
export function detachChangeDetection() {
  changeDetectionEnabled = false;
}

/**
 * Reactiva la detección de cambios
 */
export function attachChangeDetection() {
  changeDetectionEnabled = true;
}

/**
 * Ejecuta código sin activar la detección de cambios
 * 
 * @param {Function} fn - Función a ejecutar
 */
export function runOutsideChangeDetection(fn) {
  const previousState = changeDetectionEnabled;
  changeDetectionEnabled = false;
  
  try {
    fn();
  } finally {
    changeDetectionEnabled = previousState;
  }
}

/**
 * Decorador para establecer la estrategia de detección de cambios
 * 
 * @param {string} strategy - Estrategia de detección de cambios
 * @returns {Function} Decorador
 */
export function ChangeDetection(strategy) {
  return function(target) {
    target.prototype._changeDetectionStrategy = strategy;
    return target;
  };
}

// Inicializa el sistema de detección de cambios
export function initChangeDetection() {
  // Patch para métodos nativos que pueden causar cambios
  patchNativeMethods();
}

/**
 * Modifica métodos nativos para activar detección de cambios automáticamente
 */
function patchNativeMethods() {
  // Patch para eventos DOM
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Envuelve el listener para activar detección de cambios
    const wrappedListener = function(event) {
      const result = listener.call(this, event);
      scheduleChangeDetection();
      return result;
    };
    
    return originalAddEventListener.call(this, type, wrappedListener, options);
  };
  
  // Patch para promesas
  const originalThen = Promise.prototype.then;
  Promise.prototype.then = function(onFulfilled, onRejected) {
    return originalThen.call(
      this,
      onFulfilled ? function(value) {
        const result = onFulfilled(value);
        scheduleChangeDetection();
        return result;
      } : onFulfilled,
      onRejected ? function(reason) {
        const result = onRejected(reason);
        scheduleChangeDetection();
        return result;
      } : onRejected
    );
  };
  
  // Patch para setTimeout y setInterval
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay, ...args) {
    return originalSetTimeout(function() {
      fn(...args);
      scheduleChangeDetection();
    }, delay);
  };
  
  const originalSetInterval = window.setInterval;
  window.setInterval = function(fn, delay, ...args) {
    return originalSetInterval(function() {
      fn(...args);
      scheduleChangeDetection();
    }, delay);
  };
  
  // Patch para fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(
      response => {
        scheduleChangeDetection();
        return response;
      },
      error => {
        scheduleChangeDetection();
        throw error;
      }
    );
  };
}
