/**
 * Componente de página no encontrada
 */
import { Component } from '../../../src/decorators/component.js';
import { router } from '../../../src/router/router.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-not-found',
  template: `
    <div class="not-found-container">
      <div class="card">
        <h2>404 - Página no encontrada</h2>
        <p>Lo sentimos, la página que estás buscando no existe.</p>
        <p>La URL <strong>{{ currentUrl }}</strong> no corresponde a ninguna ruta definida en la aplicación.</p>
        <button (click)="goHome()">Volver al inicio</button>
      </div>
    </div>
  `
};
class NotFoundComponentClass {
  constructor() {
    this.currentUrl = '';
  }
  
  ngOnInit() {
    // Obtener la URL actual
    if (router) {
      this.currentUrl = router.currentUrl || window.location.pathname;
    } else {
      this.currentUrl = window.location.pathname;
    }
  }
  
  goHome() {
    router.navigate(['/home']);
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const NotFoundComponent = Component(componentConfig)(NotFoundComponentClass);
