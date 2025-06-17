/**
 * Decoradores Input y Output para Lagunlar
 * Implementa comunicación entre componentes similar a Angular
 */

/**
 * EventEmitter para manejar eventos personalizados
 * Similar al EventEmitter de Angular
 */
export class EventEmitter {
  constructor() {
    this.listeners = [];
  }
  
  /**
   * Suscribe un listener al evento
   * 
   * @param {Function} listener - Función a llamar cuando se emite el evento
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Devuelve una función para cancelar la suscripción
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Emite un evento con los datos proporcionados
   * 
   * @param {*} data - Datos a emitir con el evento
   */
  emit(data) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error('Error en listener de evento:', e);
      }
    });
  }
}

// Almacena las propiedades de entrada de cada clase
const inputsMap = new WeakMap();

// Almacena las propiedades de salida de cada clase
const outputsMap = new WeakMap();

/**
 * Decorador Input para propiedades de entrada
 * 
 * @param {string} [bindingPropertyName] - Nombre opcional para el binding
 * @returns {Function} Decorador de propiedad
 */
export function Input(bindingPropertyName) {
  return function(target, propertyKey) {
    // Obtener o crear el mapa de inputs para esta clase
    let inputs = inputsMap.get(target.constructor);
    if (!inputs) {
      inputs = new Map();
      inputsMap.set(target.constructor, inputs);
    }
    
    // Registrar la propiedad como input
    inputs.set(propertyKey, bindingPropertyName || propertyKey);
    
    // Crear un descriptor de propiedad para manejar cambios
    const descriptor = {
      get: function() {
        return this[`_${propertyKey}`];
      },
      set: function(newValue) {
        const oldValue = this[`_${propertyKey}`];
        this[`_${propertyKey}`] = newValue;
        
        // Llamar a ngOnChanges si existe y el valor ha cambiado
        if (this.ngOnChanges && oldValue !== newValue) {
          const simpleChange = {
            previousValue: oldValue,
            currentValue: newValue,
            firstChange: oldValue === undefined
          };
          
          this.ngOnChanges({ [propertyKey]: simpleChange });
          
          // Marcar el componente para verificación si tiene detección de cambios
          if (this.markForCheck) {
            this.markForCheck();
          }
        }
      },
      enumerable: true,
      configurable: true
    };
    
    // Definir la propiedad con el descriptor
    Object.defineProperty(target, propertyKey, descriptor);
  };
}

/**
 * Decorador Output para eventos de salida
 * 
 * @param {string} [bindingPropertyName] - Nombre opcional para el binding
 * @returns {Function} Decorador de propiedad
 */
export function Output(bindingPropertyName) {
  return function(target, propertyKey) {
    // Obtener o crear el mapa de outputs para esta clase
    let outputs = outputsMap.get(target.constructor);
    if (!outputs) {
      outputs = new Map();
      outputsMap.set(target.constructor, outputs);
    }
    
    // Registrar la propiedad como output
    outputs.set(propertyKey, bindingPropertyName || propertyKey);
    
    // Crear un EventEmitter para esta propiedad
    const eventEmitter = new EventEmitter();
    
    // Definir la propiedad como un EventEmitter
    Object.defineProperty(target, propertyKey, {
      get: function() {
        // Crear un EventEmitter si no existe
        if (!this[`_${propertyKey}`]) {
          this[`_${propertyKey}`] = eventEmitter;
        }
        return this[`_${propertyKey}`];
      },
      set: function(newValue) {
        this[`_${propertyKey}`] = newValue;
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Obtiene los inputs registrados para una clase de componente
 * 
 * @param {Function} componentClass - Clase del componente
 * @returns {Map} Mapa de propiedades de entrada
 */
export function getComponentInputs(componentClass) {
  return inputsMap.get(componentClass) || new Map();
}

/**
 * Obtiene los outputs registrados para una clase de componente
 * 
 * @param {Function} componentClass - Clase del componente
 * @returns {Map} Mapa de propiedades de salida
 */
export function getComponentOutputs(componentClass) {
  return outputsMap.get(componentClass) || new Map();
}

/**
 * Aplica los inputs desde un componente padre a un componente hijo
 * 
 * @param {Object} childComponent - Instancia del componente hijo
 * @param {Object} parentProps - Propiedades del componente padre
 */
export function applyInputsToComponent(childComponent, parentProps) {
  const componentClass = childComponent.constructor;
  const inputs = getComponentInputs(componentClass);
  
  // Aplicar cada input registrado
  inputs.forEach((bindingName, propName) => {
    // Buscar la propiedad en el padre usando el nombre de binding
    if (bindingName in parentProps) {
      // Asignar el valor al hijo
      childComponent[propName] = parentProps[bindingName];
    }
  });
}

/**
 * Conecta los outputs de un componente hijo a un componente padre
 * 
 * @param {Object} childComponent - Instancia del componente hijo
 * @param {Object} parentHandlers - Manejadores de eventos del componente padre
 */
export function connectOutputsToParent(childComponent, parentHandlers) {
  const componentClass = childComponent.constructor;
  const outputs = getComponentOutputs(componentClass);
  
  // Conectar cada output registrado
  outputs.forEach((bindingName, propName) => {
    // Buscar el manejador en el padre usando el nombre de binding
    const handler = parentHandlers[bindingName];
    
    if (typeof handler === 'function') {
      // Suscribir el manejador al EventEmitter
      childComponent[propName].subscribe(data => {
        handler(data);
      });
    }
  });
}
