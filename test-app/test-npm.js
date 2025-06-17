/**
 * Script para probar la biblioteca AngeLite después de la construcción
 * Esto simula cómo se usaría la biblioteca cuando se instala desde npm
 */

// Importar AngeLite desde la distribución
import { 
  Component, 
  bootstrap,
  ChangeDetectionStrategy,
  FormGroup,
  FormControl,
  Validators
} from '../dist/angelite.esm.js';

// Definir un componente de prueba
@Component({
  selector: 'app-test',
  template: `
    <div class="test-container">
      <h2>{{ title }}</h2>
      
      <div class="counter-section">
        <h3>Counter Test</h3>
        <p>Current count: {{ count }}</p>
        <button (click)="increment()">Increment</button>
        <button (click)="decrement()">Decrement</button>
      </div>
      
      @if (count > 5) {
        <div class="alert">
          Count is greater than 5!
        </div>
      }
      
      <div class="list-section">
        <h3>List Test</h3>
        <ul>
          @for (item of items; track item.id) {
            <li>{{ item.name }}</li>
          }
        </ul>
      </div>
      
      <div class="form-section">
        <h3>Form Test</h3>
        <form [formGroup]="testForm" (submit)="submitForm()">
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" formControlName="name">
            @if (formErrors.name) {
              <div class="error">{{ formErrors.name }}</div>
            }
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" formControlName="email">
            @if (formErrors.email) {
              <div class="error">{{ formErrors.email }}</div>
            }
          </div>
          
          <button type="submit" [disabled]="!testForm.valid">Submit</button>
        </form>
        
        @if (formSubmitted) {
          <div class="success">Form submitted successfully!</div>
        }
      </div>
    </div>
  `,
  styles: `
    .test-container {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #72a2ac;
      border-radius: 8px;
    }
    
    h2 {
      color: #3d6c6f;
      text-align: center;
    }
    
    h3 {
      color: #bf3f27;
      margin-top: 20px;
    }
    
    button {
      background-color: #3d6c6f;
      color: white;
      border: none;
      padding: 8px 16px;
      margin-right: 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #bf3f27;
    }
    
    .alert {
      background-color: #ef7b4f;
      color: white;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      color: #3d6c6f;
    }
    
    input {
      width: 100%;
      padding: 8px;
      border: 1px solid #72a2ac;
      border-radius: 4px;
    }
    
    .error {
      color: #bf3f27;
      font-size: 0.9em;
      margin-top: 5px;
    }
    
    .success {
      background-color: #4CAF50;
      color: white;
      padding: 10px;
      border-radius: 4px;
      margin-top: 15px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default
})
class TestComponent {
  title = 'AngeLite NPM Test';
  count = 0;
  formSubmitted = false;
  
  items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ];
  
  testForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.email])
  });
  
  formErrors = {};
  
  constructor() {
    this.testForm.valueChanges.subscribe(() => {
      this.validateForm();
    });
  }
  
  increment() {
    this.count++;
  }
  
  decrement() {
    if (this.count > 0) {
      this.count--;
    }
  }
  
  validateForm() {
    this.formErrors = {};
    
    const controls = this.testForm.controls;
    
    if (controls.name.invalid && controls.name.touched) {
      if (controls.name.errors.required) {
        this.formErrors.name = 'Name is required';
      } else if (controls.name.errors.minlength) {
        this.formErrors.name = 'Name must be at least 3 characters';
      }
    }
    
    if (controls.email.invalid && controls.email.touched) {
      if (controls.email.errors.required) {
        this.formErrors.email = 'Email is required';
      } else if (controls.email.errors.email) {
        this.formErrors.email = 'Please enter a valid email';
      }
    }
  }
  
  submitForm() {
    if (this.testForm.valid) {
      console.log('Form submitted:', this.testForm.value);
      this.formSubmitted = true;
    } else {
      this.testForm.markAllAsTouched();
      this.validateForm();
    }
  }
}

// Bootstrap the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    bootstrap(TestComponent, appRoot);
    console.log('AngeLite test application bootstrapped successfully!');
  } else {
    console.error('Could not find app root element with id "app"');
  }
});
