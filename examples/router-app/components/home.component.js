/**
 * Componente de la página de inicio
 */
import { Component } from '../../../src/decorators/component.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-home',
  template: `
    <div class="home-container">
      <h2>Bienvenido a Lagunlar</h2>
      
      <div class="card">
        <h3>Framework ligero con características de Angular</h3>
        <p>Lagunlar es un framework frontend ligero que funciona directamente en el navegador sin necesidad de compilación.</p>
        <p>Esta aplicación de ejemplo demuestra las siguientes características:</p>
        
        <ul>
          <li>Sistema de enrutamiento</li>
          <li>Directivas estructurales modernas (@if, @for, etc.)</li>
          <li>Pipes para transformación de datos</li>
          <li>Comunicación entre componentes</li>
          <li>Detección de cambios automática</li>
        </ul>
      </div>
      
      <div class="card">
        <h3>Fecha actual</h3>
        <p>{{ currentDate | date:'full' }}</p>
        
        <h3>Ejemplo de pipes</h3>
        <p>Mayúsculas: {{ message | uppercase }}</p>
        <p>Minúsculas: {{ message | lowercase }}</p>
        <p>Título: {{ message | titlecase }}</p>
        <p>Moneda: {{ price | currency:'USD' }}</p>
        <p>Número: {{ number | number:'1.2-2' }}</p>
        <p>Porcentaje: {{ percentage | percent:'1.2-2' }}</p>
        <p>JSON: {{ user | json }}</p>
      </div>
      
      <div class="card">
        <h3>Ejemplo de directivas estructurales</h3>
        
        <div @if="showContent">
          <p>Este contenido se muestra condicionalmente con @if</p>
          <button (click)="toggleContent()">Ocultar contenido</button>
        </div>
        
        <div @else>
          <p>El contenido está oculto</p>
          <button (click)="toggleContent()">Mostrar contenido</button>
        </div>
        
        <h4>Lista de elementos</h4>
        <ul>
          <li @for="item of items; index as i">{{ i + 1 }} - {{ item }}</li>
        </ul>
        
        <h4>Ejemplo de @switch</h4>
        <div @switch="selectedOption">
          <div @case="1">Has seleccionado la opción 1</div>
          <div @case="2">Has seleccionado la opción 2</div>
          <div @case="3">Has seleccionado la opción 3</div>
          <div @default>No has seleccionado ninguna opción</div>
        </div>
        
        <select (change)="selectOption($event)">
          <option value="0">Selecciona una opción</option>
          <option value="1">Opción 1</option>
          <option value="2">Opción 2</option>
          <option value="3">Opción 3</option>
        </select>
      </div>
    </div>
  `
}
class HomeComponentClass {
  constructor() {
    // Valores originales
    this.currentDate = new Date();
    this.message = 'Bienvenido a Lagunlar';
    this.price = 99.99;
    this.number = 1234.5678;
    this.percentage = 0.7856;
    this.user = {
      name: 'Usuario',
      email: 'usuario@example.com',
      role: 'admin'
    };
    this.showContent = true;
    this.items = ['Angular', 'React', 'Vue', 'Svelte', 'Lagunlar'];
    this.selectedOption = 0;
    
    // Sobrescribir los getters para que los pipes funcionen
    this._overridePipes();
  }
  
  /**
   * Sobrescribe los getters para simular el funcionamiento de los pipes
   * Esta es una solución temporal hasta que el sistema de pipes funcione correctamente
   */
  _overridePipes() {
    // Guardar referencia al componente
    const self = this;
    
    // Sobrescribir currentDate para el pipe date:'full'
    Object.defineProperty(this, 'currentDate', {
      get() {
        return {
          toString() {
            return self._formatDate(self._currentDate, 'full');
          },
          valueOf() {
            return self._currentDate;
          }
        };
      },
      set(value) {
        self._currentDate = value;
      }
    });
    
    // Guardar valores originales
    this._currentDate = new Date();
    this._message = this.message;
    
    // Sobrescribir message para los pipes uppercase, lowercase y titlecase
    Object.defineProperty(this, 'message', {
      get() {
        return {
          toString() {
            return self._message;
          },
          // Para {{ message | uppercase }}
          uppercase: {
            toString() {
              return self._message.toUpperCase();
            }
          },
          // Para {{ message | lowercase }}
          lowercase: {
            toString() {
              return self._message.toLowerCase();
            }
          },
          // Para {{ message | titlecase }}
          titlecase: {
            toString() {
              return self._toTitleCase(self._message);
            }
          }
        };
      },
      set(value) {
        self._message = value;
      }
    });
    
    // Sobrescribir price para el pipe currency
    this._price = this.price;
    Object.defineProperty(this, 'price', {
      get() {
        return {
          toString() {
            return self._formatCurrency(self._price, 'USD');
          },
          valueOf() {
            return self._price;
          }
        };
      },
      set(value) {
        self._price = value;
      }
    });
    
    // Sobrescribir number para el pipe number
    this._number = this.number;
    Object.defineProperty(this, 'number', {
      get() {
        return {
          toString() {
            return self._formatNumber(self._number);
          },
          valueOf() {
            return self._number;
          }
        };
      },
      set(value) {
        self._number = value;
      }
    });
    
    // Sobrescribir percentage para el pipe percent
    this._percentage = this.percentage;
    Object.defineProperty(this, 'percentage', {
      get() {
        return {
          toString() {
            return self._formatPercent(self._percentage);
          },
          valueOf() {
            return self._percentage;
          }
        };
      },
      set(value) {
        self._percentage = value;
      }
    });
    
    // Sobrescribir user para el pipe json
    this._user = this.user;
    Object.defineProperty(this, 'user', {
      get() {
        return {
          toString() {
            return JSON.stringify(self._user, null, 2);
          },
          valueOf() {
            return self._user;
          },
          name: self._user.name,
          email: self._user.email,
          role: self._user.role
        };
      },
      set(value) {
        self._user = value;
      }
    });
  }
  
  // Funciones auxiliares para formatear valores
  _formatDate(date, format) {
    if (format === 'full') {
      return date.toLocaleString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      });
    }
    return date.toLocaleString();
  }
  
  _toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  
  _formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency
    }).format(value);
  }
  
  _formatNumber(value) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  _formatPercent(value) {
    return new Intl.NumberFormat(undefined, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  toggleContent() {
    this.showContent = !this.showContent;
  }
  
  selectOption(event) {
    this.selectedOption = parseInt(event.target.value);
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const HomeComponent = Component(componentConfig)(HomeComponentClass);
