/**
 * Pipes incorporados para Lagunlar
 * Implementa transformadores de datos comunes
 */

import { Pipe } from './pipe.js';

/**
 * Pipe UpperCasePipe - Convierte texto a mayúsculas
 * Uso: {{ value | uppercase }}
 */
export class UpperCasePipe {
  transform(value) {
    if (value == null) return '';
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value.toUpperCase();
  }
}

/**
 * Pipe LowerCasePipe - Convierte texto a minúsculas
 * Uso: {{ value | lowercase }}
 */
export class LowerCasePipe {
  transform(value) {
    if (value == null) return '';
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value.toLowerCase();
  }
}

/**
 * Pipe DatePipe - Formatea fechas
 * Uso: {{ value | date:'format' }}
 * Formatos: 'short', 'medium', 'long', 'full', 'yyyy-MM-dd', etc.
 */
export class DatePipe {
  transform(value, format = 'medium') {
    if (value == null) return '';
    
    // Convertir a objeto Date si no lo es
    if (!(value instanceof Date)) {
      if (typeof value === 'number' || typeof value === 'string') {
        value = new Date(value);
      } else {
        return '';
      }
    }
    
    // Verificar si es una fecha válida
    if (isNaN(value.getTime())) {
      return '';
    }
    
    // Formatos predefinidos
    switch (format) {
      case 'short':
        return value.toLocaleDateString();
      case 'medium':
        return value.toLocaleString();
      case 'long':
        return value.toLocaleString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'full':
        return value.toLocaleString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          timeZoneName: 'short'
        });
      default:
        // Formato personalizado simple
        return this.formatCustomDate(value, format);
    }
  }
  
  formatCustomDate(date, format) {
    // Implementación simple de formato personalizado
    return format
      .replace('yyyy', date.getFullYear())
      .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
      .replace('dd', String(date.getDate()).padStart(2, '0'))
      .replace('HH', String(date.getHours()).padStart(2, '0'))
      .replace('mm', String(date.getMinutes()).padStart(2, '0'))
      .replace('ss', String(date.getSeconds()).padStart(2, '0'));
  }
}

/**
 * Pipe CurrencyPipe - Formatea valores como moneda
 * Uso: {{ value | currency:'USD':true:'1.2-2' }}
 */
export class CurrencyPipe {
  transform(value, currencyCode = 'USD', symbol = true, digitsInfo = '1.2-2') {
    if (value == null) return '';
    
    // Convertir a número si no lo es
    value = Number(value);
    if (isNaN(value)) return '';
    
    try {
      // Usar Intl.NumberFormat para formateo de moneda
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: symbol ? 'symbol' : 'code',
        minimumFractionDigits: this.getMinFractionDigits(digitsInfo),
        maximumFractionDigits: this.getMaxFractionDigits(digitsInfo)
      });
      
      return formatter.format(value);
    } catch (e) {
      console.error('Error formateando moneda:', e);
      return value.toString();
    }
  }
  
  getMinFractionDigits(digitsInfo) {
    if (!digitsInfo) return 2;
    const parts = digitsInfo.split('.');
    if (parts.length < 2) return 2;
    const minMaxFraction = parts[1].split('-');
    return parseInt(minMaxFraction[0]) || 2;
  }
  
  getMaxFractionDigits(digitsInfo) {
    if (!digitsInfo) return 2;
    const parts = digitsInfo.split('.');
    if (parts.length < 2) return 2;
    const minMaxFraction = parts[1].split('-');
    return parseInt(minMaxFraction[1] || minMaxFraction[0]) || 2;
  }
}

/**
 * Pipe DecimalPipe - Formatea números
 * Uso: {{ value | number:'1.2-2' }}
 */
export class DecimalPipe {
  transform(value, digitsInfo = '1.0-3') {
    if (value == null) return '';
    
    // Convertir a número si no lo es
    value = Number(value);
    if (isNaN(value)) return '';
    
    try {
      // Analizar el formato
      const [minIntDigits, minFraction, maxFraction] = this.parseDigitsInfo(digitsInfo);
      
      // Usar Intl.NumberFormat para formateo de números
      const formatter = new Intl.NumberFormat(undefined, {
        minimumIntegerDigits: minIntDigits,
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction
      });
      
      return formatter.format(value);
    } catch (e) {
      console.error('Error formateando número:', e);
      return value.toString();
    }
  }
  
  parseDigitsInfo(digitsInfo) {
    if (!digitsInfo) return [1, 0, 3];
    
    const parts = digitsInfo.split('.');
    const minIntDigits = parseInt(parts[0]) || 1;
    
    if (parts.length < 2) return [minIntDigits, 0, 3];
    
    const fractionParts = parts[1].split('-');
    const minFraction = parseInt(fractionParts[0]) || 0;
    const maxFraction = parseInt(fractionParts[1] || fractionParts[0]) || 3;
    
    return [minIntDigits, minFraction, maxFraction];
  }
}

/**
 * Pipe PercentPipe - Formatea números como porcentajes
 * Uso: {{ value | percent:'1.2-2' }}
 */
export class PercentPipe {
  transform(value, digitsInfo = '1.0-0') {
    if (value == null) return '';
    
    // Convertir a número si no lo es
    value = Number(value);
    if (isNaN(value)) return '';
    
    try {
      // Analizar el formato
      const [minIntDigits, minFraction, maxFraction] = this.parseDigitsInfo(digitsInfo);
      
      // Usar Intl.NumberFormat para formateo de porcentajes
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'percent',
        minimumIntegerDigits: minIntDigits,
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction
      });
      
      return formatter.format(value);
    } catch (e) {
      console.error('Error formateando porcentaje:', e);
      return `${(value * 100).toFixed(0)}%`;
    }
  }
  
  parseDigitsInfo(digitsInfo) {
    if (!digitsInfo) return [1, 0, 0];
    
    const parts = digitsInfo.split('.');
    const minIntDigits = parseInt(parts[0]) || 1;
    
    if (parts.length < 2) return [minIntDigits, 0, 0];
    
    const fractionParts = parts[1].split('-');
    const minFraction = parseInt(fractionParts[0]) || 0;
    const maxFraction = parseInt(fractionParts[1] || fractionParts[0]) || 0;
    
    return [minIntDigits, minFraction, maxFraction];
  }
}

/**
 * Pipe JsonPipe - Convierte un objeto a string JSON
 * Uso: {{ value | json }}
 */
export class JsonPipe {
  transform(value) {
    if (value == null) return 'null';
    
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      console.error('Error convirtiendo a JSON:', e);
      return String(value);
    }
  }
}

/**
 * Pipe SlicePipe - Extrae una porción de un array o string
 * Uso: {{ value | slice:start[:end] }}
 */
export class SlicePipe {
  transform(value, start, end) {
    if (value == null) return value;
    
    if (typeof value === 'string') {
      return this.sliceString(value, start, end);
    }
    
    if (Array.isArray(value)) {
      return this.sliceArray(value, start, end);
    }
    
    return value;
  }
  
  sliceString(str, start, end) {
    return str.slice(start, end);
  }
  
  sliceArray(arr, start, end) {
    return arr.slice(start, end);
  }
}

/**
 * Pipe AsyncPipe - Maneja valores asincrónicos (Promises y Observables)
 * Uso: {{ value | async }}
 */
export class AsyncPipe {
  constructor() {
    this.value = null;
    this.subscription = null;
    this.promise = null;
  }
  
  transform(obj) {
    if (obj == null) {
      this.dispose();
      return null;
    }
    
    // Manejar Promises
    if (obj instanceof Promise) {
      if (obj !== this.promise) {
        this.dispose();
        this.promise = obj;
        
        // Actualizar valor cuando la promesa se resuelva
        obj.then(value => {
          if (obj === this.promise) {
            this.value = value;
          }
        }).catch(err => {
          console.error('Error en AsyncPipe:', err);
        });
      }
      
      return this.value;
    }
    
    // Manejar objetos con método subscribe (Observable-like)
    if (typeof obj.subscribe === 'function') {
      if (!this.subscription) {
        this.subscription = obj.subscribe({
          next: value => {
            this.value = value;
          },
          error: err => {
            console.error('Error en AsyncPipe:', err);
          }
        });
      }
      
      return this.value;
    }
    
    // Para otros tipos, devolver el valor directamente
    return obj;
  }
  
  dispose() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.promise = null;
    this.value = null;
  }
}

/**
 * Pipe TitleCasePipe - Convierte texto a formato título
 * Uso: {{ value | titlecase }}
 */
export class TitleCasePipe {
  transform(value) {
    if (value == null) return '';
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    return value.replace(/\w\S*/g, txt => {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
  }
}

// Registrar todos los pipes incorporados
export function registerBuiltInPipes() {
  console.log('Registrando pipes incorporados...');
  
  // Crear instancias de los pipes directamente para asegurar que estén disponibles inmediatamente
  window.uppercasePipe = new UpperCasePipe();
  window.lowercasePipe = new LowerCasePipe();
  window.titlecasePipe = new TitleCasePipe();
  window.datePipe = new DatePipe();
  window.currencyPipe = new CurrencyPipe();
  window.numberPipe = new DecimalPipe();
  window.percentPipe = new PercentPipe();
  window.jsonPipe = new JsonPipe();
  window.slicePipe = new SlicePipe();
  window.asyncPipe = new AsyncPipe();
  
  // Registrar manualmente cada pipe con su nombre
  Pipe({ name: 'uppercase' })(UpperCasePipe);
  Pipe({ name: 'lowercase' })(LowerCasePipe);
  Pipe({ name: 'titlecase' })(TitleCasePipe);
  Pipe({ name: 'date' })(DatePipe);
  Pipe({ name: 'currency' })(CurrencyPipe);
  Pipe({ name: 'number' })(DecimalPipe);
  Pipe({ name: 'percent' })(PercentPipe);
  Pipe({ name: 'json' })(JsonPipe);
  Pipe({ name: 'slice' })(SlicePipe);
  Pipe({ name: 'async', pure: false })(AsyncPipe);
  
  console.log('Pipes incorporados registrados correctamente');
}
