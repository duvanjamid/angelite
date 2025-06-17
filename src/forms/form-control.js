/**
 * Sistema de formularios reactivos para Lagunlar
 * Implementa controles de formulario similares a Angular
 */

/**
 * Clase base para controles de formulario
 */
export class AbstractControl {
  constructor(validators = null, asyncValidators = null) {
    this.value = null;
    this.errors = null;
    this.pristine = true;
    this.dirty = false;
    this.touched = false;
    this.untouched = true;
    this.valid = true;
    this.invalid = false;
    this.disabled = false;
    this.enabled = true;
    this.validators = validators || [];
    this.asyncValidators = asyncValidators || [];
    this.status = 'VALID';
    this.statusChanges = new EventEmitter();
    this.valueChanges = new EventEmitter();
    this.parent = null;
    this._pendingAsyncValidation = false;
  }
  
  /**
   * Establece el valor del control
   * 
   * @param {*} value - Nuevo valor
   * @param {Object} options - Opciones
   * @param {boolean} options.onlySelf - Si solo debe actualizarse este control
   * @param {boolean} options.emitEvent - Si debe emitirse un evento de cambio de valor
   * @param {boolean} options.emitModelToViewChange - Si debe emitirse un evento de cambio de modelo a vista
   * @param {boolean} options.emitViewToModelChange - Si debe emitirse un evento de cambio de vista a modelo
   */
  setValue(value, options = {}) {
    this.value = value;
    this.markAsDirty();
    
    if (options.emitEvent !== false) {
      this.valueChanges.emit(value);
    }
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Parcheado del valor del control
   * 
   * @param {*} value - Valor a parchear
   * @param {Object} options - Opciones
   */
  patchValue(value, options = {}) {
    this.setValue(value, options);
  }
  
  /**
   * Restablece el control a su estado inicial
   * 
   * @param {*} formState - Estado inicial
   * @param {Object} options - Opciones
   */
  reset(formState = null, options = {}) {
    this.setValue(formState, options);
    this.markAsPristine();
    this.markAsUntouched();
  }
  
  /**
   * Actualiza el valor y la validez del control
   * 
   * @param {Object} options - Opciones
   */
  updateValueAndValidity(options = {}) {
    this.setErrors(this.runValidators());
    
    if (this.asyncValidators.length > 0) {
      this._pendingAsyncValidation = true;
      this.status = 'PENDING';
      
      Promise.all(this.asyncValidators.map(validator => validator(this)))
        .then(validationResults => {
          this._pendingAsyncValidation = false;
          
          // Combinar resultados de validación asíncrona
          const asyncErrors = validationResults.reduce((acc, result) => {
            return { ...acc, ...result };
          }, {});
          
          this.setErrors({ ...this.errors, ...asyncErrors });
        })
        .catch(error => {
          console.error('Error in async validation:', error);
          this._pendingAsyncValidation = false;
        });
    }
    
    // Actualizar estado del control
    this.updateControlStatus();
    
    // Propagar cambios al padre si es necesario
    if (this.parent && options.onlySelf !== true) {
      this.parent.updateValueAndValidity(options);
    }
  }
  
  /**
   * Ejecuta los validadores del control
   * 
   * @returns {Object|null} Errores de validación
   */
  runValidators() {
    if (!this.validators || this.validators.length === 0) {
      return null;
    }
    
    // Ejecutar todos los validadores
    const errors = this.validators
      .map(validator => validator(this))
      .filter(result => result !== null)
      .reduce((acc, errors) => ({ ...acc, ...errors }), {});
    
    return Object.keys(errors).length === 0 ? null : errors;
  }
  
  /**
   * Establece los errores del control
   * 
   * @param {Object} errors - Errores
   */
  setErrors(errors) {
    this.errors = errors;
    this.updateControlStatus();
  }
  
  /**
   * Comprueba si el control tiene un error específico
   * 
   * @param {string} errorCode - Código de error
   * @returns {boolean} Si el control tiene el error
   */
  hasError(errorCode) {
    return this.errors !== null && this.errors[errorCode] !== undefined;
  }
  
  /**
   * Obtiene un error específico
   * 
   * @param {string} errorCode - Código de error
   * @returns {*} Valor del error
   */
  getError(errorCode) {
    return this.errors && this.errors[errorCode];
  }
  
  /**
   * Actualiza el estado del control
   */
  updateControlStatus() {
    if (this.disabled) {
      this.status = 'DISABLED';
    } else if (this._pendingAsyncValidation) {
      this.status = 'PENDING';
    } else if (this.errors) {
      this.status = 'INVALID';
    } else {
      this.status = 'VALID';
    }
    
    this.valid = this.status === 'VALID';
    this.invalid = !this.valid;
    
    // Emitir cambio de estado
    this.statusChanges.emit(this.status);
  }
  
  /**
   * Marca el control como tocado
   * 
   * @param {Object} options - Opciones
   */
  markAsTouched(options = {}) {
    this.touched = true;
    this.untouched = false;
    
    if (this.parent && !options.onlySelf) {
      this.parent.markAsTouched(options);
    }
  }
  
  /**
   * Marca el control como no tocado
   * 
   * @param {Object} options - Opciones
   */
  markAsUntouched(options = {}) {
    this.touched = false;
    this.untouched = true;
    
    if (this.parent && !options.onlySelf) {
      this.parent.markAsUntouched(options);
    }
  }
  
  /**
   * Marca el control como sucio
   * 
   * @param {Object} options - Opciones
   */
  markAsDirty(options = {}) {
    this.pristine = false;
    this.dirty = true;
    
    if (this.parent && !options.onlySelf) {
      this.parent.markAsDirty(options);
    }
  }
  
  /**
   * Marca el control como pristine
   * 
   * @param {Object} options - Opciones
   */
  markAsPristine(options = {}) {
    this.pristine = true;
    this.dirty = false;
    
    if (this.parent && !options.onlySelf) {
      this.parent.markAsPristine(options);
    }
  }
  
  /**
   * Habilita el control
   * 
   * @param {Object} options - Opciones
   */
  enable(options = {}) {
    this.disabled = false;
    this.enabled = true;
    this.status = this.errors ? 'INVALID' : 'VALID';
    
    if (this.parent && !options.onlySelf) {
      this.parent.updateValueAndValidity(options);
    }
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Deshabilita el control
   * 
   * @param {Object} options - Opciones
   */
  disable(options = {}) {
    this.disabled = true;
    this.enabled = false;
    this.status = 'DISABLED';
    
    if (this.parent && !options.onlySelf) {
      this.parent.updateValueAndValidity(options);
    }
    
    this.updateValueAndValidity(options);
  }
}

/**
 * Control de formulario para un único valor
 */
export class FormControl extends AbstractControl {
  /**
   * @param {*} formState - Estado inicial del control
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   */
  constructor(formState = null, validators = null, asyncValidators = null) {
    super(
      Array.isArray(validators) ? validators : validators ? [validators] : null,
      Array.isArray(asyncValidators) ? asyncValidators : asyncValidators ? [asyncValidators] : null
    );
    
    this.setValue(formState);
  }
  
  /**
   * Registra un listener para cambios de valor
   * 
   * @param {Function} fn - Función a llamar cuando cambia el valor
   * @returns {Function} Función para cancelar la suscripción
   */
  registerOnChange(fn) {
    return this.valueChanges.subscribe(fn);
  }
  
  /**
   * Registra un listener para cuando el control es tocado
   * 
   * @param {Function} fn - Función a llamar cuando el control es tocado
   */
  registerOnTouched(fn) {
    this._onTouched = fn;
  }
  
  /**
   * Obtiene el valor sin procesar del control
   * 
   * @returns {*} Valor sin procesar
   */
  getRawValue() {
    return this.value;
  }
}

/**
 * Grupo de controles de formulario
 */
export class FormGroup extends AbstractControl {
  /**
   * @param {Object} controls - Controles del grupo
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   */
  constructor(controls = {}, validators = null, asyncValidators = null) {
    super(
      Array.isArray(validators) ? validators : validators ? [validators] : null,
      Array.isArray(asyncValidators) ? asyncValidators : asyncValidators ? [asyncValidators] : null
    );
    
    this.controls = controls;
    
    // Establecer el padre de cada control
    Object.keys(controls).forEach(key => {
      controls[key].parent = this;
    });
    
    this.updateValueAndValidity({ onlySelf: true });
  }
  
  /**
   * Registra un control en el grupo
   * 
   * @param {string} name - Nombre del control
   * @param {AbstractControl} control - Control a registrar
   */
  registerControl(name, control) {
    control.parent = this;
    this.controls[name] = control;
    this.updateValueAndValidity();
    return control;
  }
  
  /**
   * Añade un control al grupo
   * 
   * @param {string} name - Nombre del control
   * @param {AbstractControl} control - Control a añadir
   */
  addControl(name, control) {
    this.registerControl(name, control);
  }
  
  /**
   * Elimina un control del grupo
   * 
   * @param {string} name - Nombre del control a eliminar
   */
  removeControl(name) {
    if (this.controls[name]) {
      delete this.controls[name];
      this.updateValueAndValidity();
    }
  }
  
  /**
   * Obtiene un control por su nombre
   * 
   * @param {string} controlName - Nombre del control
   * @returns {AbstractControl} Control
   */
  get(controlName) {
    return this.controls[controlName] || null;
  }
  
  /**
   * Establece el valor del grupo
   * 
   * @param {Object} value - Valores para los controles
   * @param {Object} options - Opciones
   */
  setValue(value, options = {}) {
    Object.keys(value).forEach(name => {
      if (this.controls[name]) {
        this.controls[name].setValue(value[name], { 
          onlySelf: true, 
          emitEvent: options.emitEvent 
        });
      }
    });
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Parcheado del valor del grupo
   * 
   * @param {Object} value - Valores para los controles
   * @param {Object} options - Opciones
   */
  patchValue(value, options = {}) {
    Object.keys(value).forEach(name => {
      if (this.controls[name]) {
        this.controls[name].patchValue(value[name], { 
          onlySelf: true, 
          emitEvent: options.emitEvent 
        });
      }
    });
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Restablece el grupo a su estado inicial
   * 
   * @param {Object} formState - Estado inicial
   * @param {Object} options - Opciones
   */
  reset(formState = {}, options = {}) {
    Object.keys(this.controls).forEach(name => {
      this.controls[name].reset(formState[name] || null, { 
        onlySelf: true, 
        emitEvent: options.emitEvent 
      });
    });
    
    this.updateValueAndValidity(options);
    this.markAsPristine(options);
    this.markAsUntouched(options);
  }
  
  /**
   * Comprueba si el grupo tiene un control específico
   * 
   * @param {string} controlName - Nombre del control
   * @returns {boolean} Si el grupo tiene el control
   */
  contains(controlName) {
    return this.controls[controlName] !== undefined;
  }
  
  /**
   * Actualiza el valor y la validez del grupo
   * 
   * @param {Object} options - Opciones
   */
  updateValueAndValidity(options = {}) {
    // Actualizar el valor del grupo
    this.value = this.getRawValue();
    
    super.updateValueAndValidity(options);
  }
  
  /**
   * Obtiene el valor sin procesar del grupo
   * 
   * @returns {Object} Valor sin procesar
   */
  getRawValue() {
    const rawValue = {};
    
    Object.keys(this.controls).forEach(key => {
      const control = this.controls[key];
      rawValue[key] = control instanceof FormControl ? 
        control.value : 
        control.getRawValue();
    });
    
    return rawValue;
  }
}

/**
 * Array de controles de formulario
 */
export class FormArray extends AbstractControl {
  /**
   * @param {AbstractControl[]} controls - Controles del array
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   */
  constructor(controls = [], validators = null, asyncValidators = null) {
    super(
      Array.isArray(validators) ? validators : validators ? [validators] : null,
      Array.isArray(asyncValidators) ? asyncValidators : asyncValidators ? [asyncValidators] : null
    );
    
    this.controls = controls;
    
    // Establecer el padre de cada control
    controls.forEach(control => {
      control.parent = this;
    });
    
    this.updateValueAndValidity({ onlySelf: true });
  }
  
  /**
   * Obtiene el control en el índice especificado
   * 
   * @param {number} index - Índice del control
   * @returns {AbstractControl} Control
   */
  at(index) {
    return this.controls[index];
  }
  
  /**
   * Añade un control al array
   * 
   * @param {AbstractControl} control - Control a añadir
   */
  push(control) {
    control.parent = this;
    this.controls.push(control);
    this.updateValueAndValidity();
    return control;
  }
  
  /**
   * Inserta un control en el índice especificado
   * 
   * @param {number} index - Índice donde insertar
   * @param {AbstractControl} control - Control a insertar
   */
  insert(index, control) {
    control.parent = this;
    this.controls.splice(index, 0, control);
    this.updateValueAndValidity();
    return control;
  }
  
  /**
   * Elimina un control del array
   * 
   * @param {number} index - Índice del control a eliminar
   */
  removeAt(index) {
    this.controls.splice(index, 1);
    this.updateValueAndValidity();
  }
  
  /**
   * Establece el valor del array
   * 
   * @param {Array} value - Valores para los controles
   * @param {Object} options - Opciones
   */
  setValue(value, options = {}) {
    if (value.length !== this.controls.length) {
      throw new Error(`FormArray setValue error: array length mismatch. Expected ${this.controls.length} but got ${value.length}`);
    }
    
    value.forEach((newValue, index) => {
      this.controls[index].setValue(newValue, { 
        onlySelf: true, 
        emitEvent: options.emitEvent 
      });
    });
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Parcheado del valor del array
   * 
   * @param {Array} value - Valores para los controles
   * @param {Object} options - Opciones
   */
  patchValue(value, options = {}) {
    value.forEach((newValue, index) => {
      if (index < this.controls.length) {
        this.controls[index].patchValue(newValue, { 
          onlySelf: true, 
          emitEvent: options.emitEvent 
        });
      }
    });
    
    this.updateValueAndValidity(options);
  }
  
  /**
   * Restablece el array a su estado inicial
   * 
   * @param {Array} formState - Estado inicial
   * @param {Object} options - Opciones
   */
  reset(formState = [], options = {}) {
    this.controls.forEach((control, index) => {
      control.reset(formState[index] || null, { 
        onlySelf: true, 
        emitEvent: options.emitEvent 
      });
    });
    
    this.updateValueAndValidity(options);
    this.markAsPristine(options);
    this.markAsUntouched(options);
  }
  
  /**
   * Obtiene el número de controles en el array
   * 
   * @returns {number} Longitud del array
   */
  get length() {
    return this.controls.length;
  }
  
  /**
   * Actualiza el valor y la validez del array
   * 
   * @param {Object} options - Opciones
   */
  updateValueAndValidity(options = {}) {
    // Actualizar el valor del array
    this.value = this.getRawValue();
    
    super.updateValueAndValidity(options);
  }
  
  /**
   * Obtiene el valor sin procesar del array
   * 
   * @returns {Array} Valor sin procesar
   */
  getRawValue() {
    return this.controls.map(control => {
      return control instanceof FormControl ? 
        control.value : 
        control.getRawValue();
    });
  }
  
  /**
   * Limpia el array eliminando todos los controles
   */
  clear() {
    this.controls = [];
    this.updateValueAndValidity();
  }
}

/**
 * Clase EventEmitter para manejar eventos
 */
class EventEmitter {
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
