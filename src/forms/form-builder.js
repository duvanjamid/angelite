/**
 * FormBuilder para Lagunlar
 * Facilita la creación de formularios reactivos
 */

import { FormControl, FormGroup, FormArray } from './form-control.js';

/**
 * Clase FormBuilder
 * Proporciona métodos para crear controles de formulario, grupos y arrays
 */
export class FormBuilder {
  /**
   * Crea un FormControl
   * 
   * @param {*} formState - Estado inicial del control
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   * @returns {FormControl} Control de formulario
   */
  control(formState, validators = null, asyncValidators = null) {
    return new FormControl(formState, validators, asyncValidators);
  }
  
  /**
   * Crea un FormGroup
   * 
   * @param {Object} controlsConfig - Configuración de controles
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   * @returns {FormGroup} Grupo de formulario
   */
  group(controlsConfig, validators = null, asyncValidators = null) {
    const controls = this.createControls(controlsConfig);
    return new FormGroup(controls, validators, asyncValidators);
  }
  
  /**
   * Crea un FormArray
   * 
   * @param {Array} controlsConfig - Configuración de controles
   * @param {Function|Function[]} validators - Validadores síncronos
   * @param {Function|Function[]} asyncValidators - Validadores asíncronos
   * @returns {FormArray} Array de formulario
   */
  array(controlsConfig, validators = null, asyncValidators = null) {
    const controls = controlsConfig.map(controlConfig => this.createControl(controlConfig));
    return new FormArray(controls, validators, asyncValidators);
  }
  
  /**
   * Crea controles a partir de una configuración
   * 
   * @param {Object} controlsConfig - Configuración de controles
   * @returns {Object} Controles creados
   */
  createControls(controlsConfig) {
    const controls = {};
    
    Object.keys(controlsConfig).forEach(controlName => {
      controls[controlName] = this.createControl(controlsConfig[controlName]);
    });
    
    return controls;
  }
  
  /**
   * Crea un control a partir de una configuración
   * 
   * @param {*} controlConfig - Configuración del control
   * @returns {AbstractControl} Control creado
   */
  createControl(controlConfig) {
    // Si ya es un AbstractControl, devolverlo directamente
    if (controlConfig instanceof FormControl || 
        controlConfig instanceof FormGroup || 
        controlConfig instanceof FormArray) {
      return controlConfig;
    }
    
    // Si es un array, crear un FormArray
    if (Array.isArray(controlConfig)) {
      return this.array(controlConfig);
    }
    
    // Si es un objeto con la propiedad 'controls', crear un FormGroup
    if (controlConfig && typeof controlConfig === 'object' && controlConfig.controls) {
      return this.group(
        controlConfig.controls, 
        controlConfig.validators, 
        controlConfig.asyncValidators
      );
    }
    
    // Si es un objeto con la propiedad 'value', crear un FormControl
    if (controlConfig && typeof controlConfig === 'object' && 'value' in controlConfig) {
      return this.control(
        controlConfig.value, 
        controlConfig.validators, 
        controlConfig.asyncValidators
      );
    }
    
    // Si es un objeto normal, crear un FormGroup
    if (controlConfig && typeof controlConfig === 'object') {
      return this.group(controlConfig);
    }
    
    // Por defecto, crear un FormControl con el valor proporcionado
    return this.control(controlConfig);
  }
}

// Instancia global del FormBuilder
export const formBuilder = new FormBuilder();
