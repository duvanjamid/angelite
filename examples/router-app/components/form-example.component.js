/**
 * Componente de ejemplo de formulario reactivo
 */
import { Component } from '../../../src/decorators/component.js';
import { 
  FormGroup, 
  FormControl, 
  FormArray 
} from '../../../src/forms/form-control.js';
import { FormBuilder } from '../../../src/forms/form-builder.js';
import * as Validators from '../../../src/forms/validators.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-form-example',
  template: `
    <div class="form-example-container">
      <h2>Formulario Reactivo</h2>
      
      <div class="card">
        <h3>Registro de Usuario</h3>
        
        <form [formGroup]="registerForm" (submit)="onSubmit()">
          <div class="form-group">
            <label for="name">Nombre:</label>
            <input 
              id="name" 
              type="text" 
              formControl="name" 
              placeholder="Nombre completo">
            <div class="error-message" @if="registerForm.get('name').invalid && registerForm.get('name').touched">
              <span @if="registerForm.get('name').hasError('required')">El nombre es obligatorio</span>
              <span @if="registerForm.get('name').hasError('minlength')">El nombre debe tener al menos 3 caracteres</span>
            </div>
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              id="email" 
              type="email" 
              formControl="email" 
              placeholder="correo@ejemplo.com">
            <div class="error-message" @if="registerForm.get('email').invalid && registerForm.get('email').touched">
              <span @if="registerForm.get('email').hasError('required')">El email es obligatorio</span>
              <span @if="registerForm.get('email').hasError('email')">El email no es válido</span>
            </div>
          </div>
          
          <div formGroupName="password">
            <div class="form-group">
              <label for="password">Contraseña:</label>
              <input 
                id="password" 
                type="password" 
                formControl="password" 
                placeholder="Contraseña">
              <div class="error-message" @if="registerForm.get('password.password').invalid && registerForm.get('password.password').touched">
                <span @if="registerForm.get('password.password').hasError('required')">La contraseña es obligatoria</span>
                <span @if="registerForm.get('password.password').hasError('minlength')">La contraseña debe tener al menos 6 caracteres</span>
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirmar Contraseña:</label>
              <input 
                id="confirmPassword" 
                type="password" 
                formControl="confirmPassword" 
                placeholder="Confirmar contraseña">
              <div class="error-message" @if="registerForm.get('password.confirmPassword').invalid && registerForm.get('password.confirmPassword').touched">
                <span @if="registerForm.get('password.confirmPassword').hasError('required')">La confirmación es obligatoria</span>
                <span @if="registerForm.get('password.confirmPassword').hasError('equalTo')">Las contraseñas no coinciden</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Intereses:</label>
            <div formArrayName="interests">
              <div @for="interest of interestsArray.controls; index as i" class="interest-item">
                <input 
                  type="text" 
                  [formControl]="'interests.' + i" 
                  placeholder="Interés {{i + 1}}">
                <button type="button" class="remove-btn" (click)="removeInterest(i)">X</button>
              </div>
              <button type="button" (click)="addInterest()">Añadir interés</button>
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" formControl="acceptTerms">
              Acepto los términos y condiciones
            </label>
            <div class="error-message" @if="registerForm.get('acceptTerms').invalid && registerForm.get('acceptTerms').touched">
              <span @if="registerForm.get('acceptTerms').hasError('required')">Debes aceptar los términos</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" [disabled]="registerForm.invalid">Registrarse</button>
            <button type="button" (click)="resetForm()">Restablecer</button>
          </div>
        </form>
        
        <div @if="submitted">
          <h4>Formulario enviado con éxito</h4>
          <pre>{{ formValues | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: `
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    input[type="text"],
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    input.ng-invalid.ng-touched {
      border-color: #e74c3c;
    }
    
    .error-message {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
    }
    
    .form-actions {
      margin-top: 20px;
    }
    
    .interest-item {
      display: flex;
      margin-bottom: 5px;
    }
    
    .interest-item input {
      flex: 1;
      margin-right: 5px;
    }
    
    .interest-item .remove-btn {
      padding: 4px 8px;
    }
    
    button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
};
class FormExampleComponentClass {
  constructor() {
    this.formBuilder = new FormBuilder();
    this.registerForm = null;
    this.submitted = false;
    this.formValues = null;
  }
  
  ngOnInit() {
    // Crear el formulario
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required(), Validators.minLength(3)]],
      email: ['', [Validators.required(), Validators.email()]],
      password: this.formBuilder.group({
        password: ['', [Validators.required(), Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required()]]
      }),
      interests: this.formBuilder.array([
        ['Angular'],
        ['Lagunlar']
      ]),
      acceptTerms: [false, Validators.required()]
    });
    
    // Añadir validador personalizado para confirmar contraseña
    const confirmPasswordControl = this.registerForm.get('password.confirmPassword');
    confirmPasswordControl.validators = [
      ...confirmPasswordControl.validators,
      Validators.equalTo('password')
    ];
    
    // Suscribirse a cambios en el formulario
    this.registerForm.valueChanges.subscribe(value => {
      console.log('Form value changed:', value);
    });
  }
  
  /**
   * Getter para el array de intereses
   */
  get interestsArray() {
    return this.registerForm.get('interests');
  }
  
  /**
   * Añade un nuevo interés al array
   */
  addInterest() {
    this.interestsArray.push(this.formBuilder.control(''));
  }
  
  /**
   * Elimina un interés del array
   * 
   * @param {number} index - Índice del interés a eliminar
   */
  removeInterest(index) {
    this.interestsArray.removeAt(index);
  }
  
  /**
   * Maneja el envío del formulario
   */
  onSubmit() {
    // Marcar todos los controles como tocados
    this.markFormGroupTouched(this.registerForm);
    
    if (this.registerForm.valid) {
      this.submitted = true;
      this.formValues = this.registerForm.value;
      console.log('Form submitted:', this.formValues);
    } else {
      console.log('Form is invalid');
    }
  }
  
  /**
   * Restablece el formulario
   */
  resetForm() {
    this.registerForm.reset({
      name: '',
      email: '',
      password: {
        password: '',
        confirmPassword: ''
      },
      interests: [
        'Angular',
        'Lagunlar'
      ],
      acceptTerms: false
    });
    
    this.submitted = false;
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
}

// Aplicar la configuración del componente usando el decorador Component
export const FormExampleComponent = Component(componentConfig)(FormExampleComponentClass);
