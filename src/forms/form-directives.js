/**
 * Directivas para formularios reactivos en Lagunlar
 * Permiten vincular controles de formulario con elementos HTML
 */

import { Directive } from '../decorators/directive.js';
import { registerDirective } from '../directives/directive-processor.js';
import { FormControl, FormGroup, FormArray } from './form-control.js';

/**
 * Directiva FormControlDirective
 * Vincula un FormControl con un elemento de formulario
 */
// Se registrará la directiva al final del archivo
export class FormControlDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.control = null;
    this.valueAccessor = null;
    this.onChangeSubscription = null;
    this.onTouchedSubscription = null;
  }
  
  ngOnInit() {
    // Obtener el nombre del control
    const controlName = this.element.getAttribute('formControl');
    
    // Obtener el control del contexto
    this.control = this.getControlFromContext(controlName);
    
    if (!this.control) {
      console.error(`FormControl '${controlName}' no encontrado en el contexto`);
      return;
    }
    
    // Crear un value accessor para el elemento
    this.valueAccessor = this.createValueAccessor(this.element);
    
    if (!this.valueAccessor) {
      console.error(`No se pudo crear un value accessor para el elemento`, this.element);
      return;
    }
    
    // Configurar la vinculación bidireccional
    this.setupTwoWayBinding();
    
    // Aplicar estado inicial
    this.updateViewFromModel();
    
    // Configurar clases CSS para estados de validación
    this.setupValidationClasses();
  }
  
  ngOnDestroy() {
    // Cancelar suscripciones
    if (this.onChangeSubscription) {
      this.onChangeSubscription();
    }
    
    if (this.onTouchedSubscription) {
      this.onTouchedSubscription();
    }
  }
  
  /**
   * Obtiene un control del contexto por su nombre
   * 
   * @param {string} controlName - Nombre del control
   * @returns {AbstractControl} Control
   */
  getControlFromContext(controlName) {
    // Buscar el control en el contexto
    if (this.context[controlName] && 
        (this.context[controlName] instanceof FormControl || 
         this.context[controlName] instanceof FormGroup || 
         this.context[controlName] instanceof FormArray)) {
      return this.context[controlName];
    }
    
    // Si no se encuentra directamente, buscar en formGroup
    if (this.context.formGroup && this.context.formGroup.get) {
      return this.context.formGroup.get(controlName);
    }
    
    return null;
  }
  
  /**
   * Crea un value accessor para el elemento
   * 
   * @param {HTMLElement} element - Elemento HTML
   * @returns {Object} Value accessor
   */
  createValueAccessor(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type && element.type.toLowerCase();
    
    // Input text, number, email, etc.
    if (tagName === 'input' && 
        (type === 'text' || type === 'number' || type === 'email' || 
         type === 'password' || type === 'tel' || type === 'url')) {
      return {
        writeValue: (value) => {
          element.value = value !== null && value !== undefined ? value : '';
        },
        registerOnChange: (fn) => {
          element.addEventListener('input', (event) => {
            fn(event.target.value);
          });
        },
        registerOnTouched: (fn) => {
          element.addEventListener('blur', () => {
            fn();
          });
        }
      };
    }
    
    // Checkbox
    if (tagName === 'input' && type === 'checkbox') {
      return {
        writeValue: (value) => {
          element.checked = !!value;
        },
        registerOnChange: (fn) => {
          element.addEventListener('change', (event) => {
            fn(event.target.checked);
          });
        },
        registerOnTouched: (fn) => {
          element.addEventListener('blur', () => {
            fn();
          });
        }
      };
    }
    
    // Radio
    if (tagName === 'input' && type === 'radio') {
      return {
        writeValue: (value) => {
          element.checked = element.value === value;
        },
        registerOnChange: (fn) => {
          element.addEventListener('change', (event) => {
            if (event.target.checked) {
              fn(event.target.value);
            }
          });
        },
        registerOnTouched: (fn) => {
          element.addEventListener('blur', () => {
            fn();
          });
        }
      };
    }
    
    // Select
    if (tagName === 'select') {
      return {
        writeValue: (value) => {
          element.value = value !== null && value !== undefined ? value : '';
        },
        registerOnChange: (fn) => {
          element.addEventListener('change', (event) => {
            fn(event.target.value);
          });
        },
        registerOnTouched: (fn) => {
          element.addEventListener('blur', () => {
            fn();
          });
        }
      };
    }
    
    // Textarea
    if (tagName === 'textarea') {
      return {
        writeValue: (value) => {
          element.value = value !== null && value !== undefined ? value : '';
        },
        registerOnChange: (fn) => {
          element.addEventListener('input', (event) => {
            fn(event.target.value);
          });
        },
        registerOnTouched: (fn) => {
          element.addEventListener('blur', () => {
            fn();
          });
        }
      };
    }
    
    return null;
  }
  
  /**
   * Configura la vinculación bidireccional entre el modelo y la vista
   */
  setupTwoWayBinding() {
    // Actualizar vista cuando cambia el modelo
    this.onChangeSubscription = this.control.valueChanges.subscribe(() => {
      this.updateViewFromModel();
    });
    
    // Actualizar modelo cuando cambia la vista
    this.valueAccessor.registerOnChange((value) => {
      this.control.setValue(value);
    });
    
    // Marcar como tocado cuando se pierde el foco
    this.valueAccessor.registerOnTouched(() => {
      this.control.markAsTouched();
    });
  }
  
  /**
   * Actualiza la vista con el valor del modelo
   */
  updateViewFromModel() {
    this.valueAccessor.writeValue(this.control.value);
  }
  
  /**
   * Configura las clases CSS para los estados de validación
   */
  setupValidationClasses() {
    // Suscribirse a cambios de estado
    this.control.statusChanges.subscribe(() => {
      this.updateValidationClasses();
    });
    
    // Aplicar clases iniciales
    this.updateValidationClasses();
  }
  
  /**
   * Actualiza las clases CSS según el estado del control
   */
  updateValidationClasses() {
    // Eliminar clases anteriores
    this.element.classList.remove('ng-valid', 'ng-invalid', 'ng-pending', 'ng-pristine', 'ng-dirty', 'ng-untouched', 'ng-touched');
    
    // Añadir clases según el estado
    this.element.classList.add(this.control.valid ? 'ng-valid' : 'ng-invalid');
    this.element.classList.add(this.control.pristine ? 'ng-pristine' : 'ng-dirty');
    this.element.classList.add(this.control.untouched ? 'ng-untouched' : 'ng-touched');
    
    if (this.control.status === 'PENDING') {
      this.element.classList.add('ng-pending');
    }
  }
}

/**
 * Directiva FormGroupDirective
 * Vincula un FormGroup con un formulario
 */
// Se registrará la directiva al final del archivo
export class FormGroupDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.formGroup = null;
    this.onSubmitListener = null;
  }
  
  ngOnInit() {
    // Obtener el nombre del formGroup
    const formGroupName = this.element.getAttribute('formGroup');
    
    // Obtener el formGroup del contexto
    this.formGroup = this.context[formGroupName];
    
    if (!this.formGroup || !(this.formGroup instanceof FormGroup)) {
      console.error(`FormGroup '${formGroupName}' no encontrado en el contexto o no es un FormGroup`);
      return;
    }
    
    // Añadir el formGroup al contexto para que esté disponible para los controles
    this.context.formGroup = this.formGroup;
    
    // Configurar el evento submit
    if (this.element.tagName.toLowerCase() === 'form') {
      this.setupSubmitEvent();
    }
    
    // Configurar clases CSS para estados de validación
    this.setupValidationClasses();
  }
  
  ngOnDestroy() {
    // Eliminar el listener de submit
    if (this.onSubmitListener) {
      this.element.removeEventListener('submit', this.onSubmitListener);
    }
  }
  
  /**
   * Configura el evento submit del formulario
   */
  setupSubmitEvent() {
    this.onSubmitListener = (event) => {
      event.preventDefault();
      
      // Marcar todos los controles como tocados
      this.markFormGroupTouched(this.formGroup);
      
      // Llamar al método onSubmit del contexto si existe
      if (typeof this.context.onSubmit === 'function') {
        this.context.onSubmit(this.formGroup);
      }
    };
    
    this.element.addEventListener('submit', this.onSubmitListener);
  }
  
  /**
   * Marca todos los controles de un formGroup como tocados
   * 
   * @param {FormGroup} formGroup - FormGroup
   */
  markFormGroupTouched(formGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  /**
   * Configura las clases CSS para los estados de validación
   */
  setupValidationClasses() {
    // Suscribirse a cambios de estado
    this.formGroup.statusChanges.subscribe(() => {
      this.updateValidationClasses();
    });
    
    // Aplicar clases iniciales
    this.updateValidationClasses();
  }
  
  /**
   * Actualiza las clases CSS según el estado del formGroup
   */
  updateValidationClasses() {
    // Eliminar clases anteriores
    this.element.classList.remove('ng-valid', 'ng-invalid', 'ng-pending', 'ng-pristine', 'ng-dirty', 'ng-untouched', 'ng-touched');
    
    // Añadir clases según el estado
    this.element.classList.add(this.formGroup.valid ? 'ng-valid' : 'ng-invalid');
    this.element.classList.add(this.formGroup.pristine ? 'ng-pristine' : 'ng-dirty');
    this.element.classList.add(this.formGroup.untouched ? 'ng-untouched' : 'ng-touched');
    
    if (this.formGroup.status === 'PENDING') {
      this.element.classList.add('ng-pending');
    }
  }
}

/**
 * Directiva FormArrayDirective
 * Vincula un FormArray con elementos HTML
 */
// Se registrará la directiva al final del archivo
export class FormArrayDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.formArray = null;
  }
  
  ngOnInit() {
    // Obtener el nombre del formArray
    const formArrayName = this.element.getAttribute('formArray');
    
    // Obtener el formArray del contexto
    this.formArray = this.getFormArrayFromContext(formArrayName);
    
    if (!this.formArray || !(this.formArray instanceof FormArray)) {
      console.error(`FormArray '${formArrayName}' no encontrado en el contexto o no es un FormArray`);
      return;
    }
    
    // Añadir el formArray al contexto para que esté disponible para los controles
    this.context.formArray = this.formArray;
  }
  
  /**
   * Obtiene un formArray del contexto por su nombre
   * 
   * @param {string} formArrayName - Nombre del formArray
   * @returns {FormArray} FormArray
   */
  getFormArrayFromContext(formArrayName) {
    // Buscar el formArray en el contexto
    if (this.context[formArrayName] && this.context[formArrayName] instanceof FormArray) {
      return this.context[formArrayName];
    }
    
    // Si no se encuentra directamente, buscar en formGroup
    if (this.context.formGroup && this.context.formGroup.get) {
      return this.context.formGroup.get(formArrayName);
    }
    
    return null;
  }
}

/**
 * Directiva FormGroupNameDirective
 * Vincula un control FormGroup anidado
 */
// Se registrará la directiva al final del archivo
export class FormGroupNameDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.formGroup = null;
    this.parentFormGroup = null;
  }
  
  ngOnInit() {
    // Obtener el nombre del formGroup
    const formGroupName = this.element.getAttribute('formGroupName');
    
    // Obtener el formGroup padre
    this.parentFormGroup = this.context.formGroup;
    
    if (!this.parentFormGroup || !(this.parentFormGroup instanceof FormGroup)) {
      console.error('No se encontró un FormGroup padre');
      return;
    }
    
    // Obtener el formGroup anidado
    this.formGroup = this.parentFormGroup.get(formGroupName);
    
    if (!this.formGroup || !(this.formGroup instanceof FormGroup)) {
      console.error(`FormGroup '${formGroupName}' no encontrado en el FormGroup padre`);
      return;
    }
    
    // Crear un nuevo contexto para los controles anidados
    const childContext = Object.create(this.context);
    childContext.formGroup = this.formGroup;
    
    // Configurar clases CSS para estados de validación
    this.setupValidationClasses();
  }
  
  /**
   * Configura las clases CSS para los estados de validación
   */
  setupValidationClasses() {
    // Suscribirse a cambios de estado
    this.formGroup.statusChanges.subscribe(() => {
      this.updateValidationClasses();
    });
    
    // Aplicar clases iniciales
    this.updateValidationClasses();
  }
  
  /**
   * Actualiza las clases CSS según el estado del formGroup
   */
  updateValidationClasses() {
    // Eliminar clases anteriores
    this.element.classList.remove('ng-valid', 'ng-invalid', 'ng-pending', 'ng-pristine', 'ng-dirty', 'ng-untouched', 'ng-touched');
    
    // Añadir clases según el estado
    this.element.classList.add(this.formGroup.valid ? 'ng-valid' : 'ng-invalid');
    this.element.classList.add(this.formGroup.pristine ? 'ng-pristine' : 'ng-dirty');
    this.element.classList.add(this.formGroup.untouched ? 'ng-untouched' : 'ng-touched');
    
    if (this.formGroup.status === 'PENDING') {
      this.element.classList.add('ng-pending');
    }
  }
}

/**
 * Directiva FormArrayNameDirective
 * Vincula un control FormArray anidado
 */
// Se registrará la directiva al final del archivo
export class FormArrayNameDirective {
  constructor() {
    this.element = null;
    this.context = null;
    this.formArray = null;
    this.parentFormGroup = null;
  }
  
  ngOnInit() {
    // Obtener el nombre del formArray
    const formArrayName = this.element.getAttribute('formArrayName');
    
    // Obtener el formGroup padre
    this.parentFormGroup = this.context.formGroup;
    
    if (!this.parentFormGroup || !(this.parentFormGroup instanceof FormGroup)) {
      console.error('No se encontró un FormGroup padre');
      return;
    }
    
    // Obtener el formArray anidado
    this.formArray = this.parentFormGroup.get(formArrayName);
    
    if (!this.formArray || !(this.formArray instanceof FormArray)) {
      console.error(`FormArray '${formArrayName}' no encontrado en el FormGroup padre`);
      return;
    }
    
    // Crear un nuevo contexto para los controles anidados
    const childContext = Object.create(this.context);
    childContext.formArray = this.formArray;
  }
}

/**
 * Registra todas las directivas de formulario
 */
export function registerFormDirectives() {
  registerDirective('[formControl]', FormControlDirective);
  registerDirective('[formGroup]', FormGroupDirective);
  registerDirective('[formArray]', FormArrayDirective);
  registerDirective('[formGroupName]', FormGroupNameDirective);
  registerDirective('[formArrayName]', FormArrayNameDirective);
}
