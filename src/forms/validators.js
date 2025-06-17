/**
 * Validadores para formularios reactivos en Lagunlar
 */

/**
 * Validador requerido
 * Valida que el control tenga un valor
 * 
 * @returns {Function} Función validadora
 */
export function required() {
  return (control) => {
    const value = control.value;
    
    // Comprobar si el valor es null, undefined o cadena vacía
    const isValid = value !== null && value !== undefined && value !== '';
    
    return isValid ? null : { required: true };
  };
}

/**
 * Validador de longitud mínima
 * Valida que el control tenga al menos un número mínimo de caracteres
 * 
 * @param {number} minLength - Longitud mínima
 * @returns {Function} Función validadora
 */
export function minLength(minLength) {
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const length = value.toString().length;
    const isValid = length >= minLength;
    
    return isValid ? null : { minlength: { requiredLength: minLength, actualLength: length } };
  };
}

/**
 * Validador de longitud máxima
 * Valida que el control no exceda un número máximo de caracteres
 * 
 * @param {number} maxLength - Longitud máxima
 * @returns {Function} Función validadora
 */
export function maxLength(maxLength) {
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const length = value.toString().length;
    const isValid = length <= maxLength;
    
    return isValid ? null : { maxlength: { requiredLength: maxLength, actualLength: length } };
  };
}

/**
 * Validador de patrón
 * Valida que el control coincida con un patrón regex
 * 
 * @param {RegExp|string} pattern - Patrón regex
 * @returns {Function} Función validadora
 */
export function pattern(pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const isValid = regex.test(value);
    
    return isValid ? null : { pattern: { requiredPattern: regex.toString(), actualValue: value } };
  };
}

/**
 * Validador de email
 * Valida que el control contenga una dirección de email válida
 * 
 * @returns {Function} Función validadora
 */
export function email() {
  // Regex simple para validar emails
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const isValid = emailRegex.test(value);
    
    return isValid ? null : { email: true };
  };
}

/**
 * Validador numérico
 * Valida que el control contenga un valor numérico
 * 
 * @returns {Function} Función validadora
 */
export function numeric() {
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const isValid = !isNaN(Number(value));
    
    return isValid ? null : { numeric: true };
  };
}

/**
 * Validador de valor mínimo
 * Valida que el control tenga un valor numérico mayor o igual que el mínimo
 * 
 * @param {number} min - Valor mínimo
 * @returns {Function} Función validadora
 */
export function min(min) {
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const numValue = Number(value);
    
    // Si no es un número, no validar
    if (isNaN(numValue)) {
      return null;
    }
    
    const isValid = numValue >= min;
    
    return isValid ? null : { min: { min, actual: numValue } };
  };
}

/**
 * Validador de valor máximo
 * Valida que el control tenga un valor numérico menor o igual que el máximo
 * 
 * @param {number} max - Valor máximo
 * @returns {Function} Función validadora
 */
export function max(max) {
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const numValue = Number(value);
    
    // Si no es un número, no validar
    if (isNaN(numValue)) {
      return null;
    }
    
    const isValid = numValue <= max;
    
    return isValid ? null : { max: { max, actual: numValue } };
  };
}

/**
 * Validador de igualdad
 * Valida que el control tenga el mismo valor que otro control
 * 
 * @param {string} otherControlName - Nombre del otro control
 * @returns {Function} Función validadora
 */
export function equalTo(otherControlName) {
  return (control) => {
    // Si no hay valor o no hay padre, no validar
    if (!control.parent) {
      return null;
    }
    
    const otherControl = control.parent.get(otherControlName);
    
    // Si no se encuentra el otro control, no validar
    if (!otherControl) {
      return null;
    }
    
    const value = control.value;
    const otherValue = otherControl.value;
    
    const isValid = value === otherValue;
    
    return isValid ? null : { equalTo: { otherValue } };
  };
}

/**
 * Combina varios validadores en uno solo
 * 
 * @param {...Function} validators - Validadores a combinar
 * @returns {Function} Validador combinado
 */
export function compose(validators) {
  if (!validators || validators.length === 0) {
    return null;
  }
  
  return (control) => {
    const errors = {};
    let hasError = false;
    
    validators.forEach(validator => {
      const result = validator(control);
      
      if (result) {
        Object.assign(errors, result);
        hasError = true;
      }
    });
    
    return hasError ? errors : null;
  };
}

/**
 * Validador asíncrono que comprueba si un valor ya existe
 * 
 * @param {Function} checkFn - Función que comprueba si el valor existe
 * @param {number} debounceTime - Tiempo de espera en ms
 * @returns {Function} Validador asíncrono
 */
export function asyncExists(checkFn, debounceTime = 300) {
  let timeout;
  
  return (control) => {
    const value = control.value;
    
    // Si no hay valor, no validar
    if (value === null || value === undefined || value === '') {
      return Promise.resolve(null);
    }
    
    // Cancelar timeout anterior
    clearTimeout(timeout);
    
    // Devolver una promesa
    return new Promise((resolve) => {
      timeout = setTimeout(() => {
        checkFn(value)
          .then(exists => {
            resolve(exists ? { exists: true } : null);
          })
          .catch(() => {
            resolve({ exists: true });
          });
      }, debounceTime);
    });
  };
}
