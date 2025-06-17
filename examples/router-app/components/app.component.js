/**
 * Componente principal de la aplicación
 */
import { Component } from '../../../src/decorators/component.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-root',
  template: `
    <div class="app-container">
      <header>
        <h1>Lagunlar Router App</h1>
        <div>
          <button id="loginBtn" @if="!isLoggedIn">Login</button>
          <button id="logoutBtn" @if="isLoggedIn">Logout</button>
        </div>
      </header>
      
      <nav>
        <ul>
          <li><a href="/home" router-link>Home</a></li>
          <li><a href="/about" router-link>About</a></li>
          <li><a href="/users" router-link>Users</a></li>
          <li><a href="/forms" router-link>Formularios</a></li>
        </ul>
      </nav>
      
      <main>
        <router-outlet></router-outlet>
      </main>
      
      <footer class="footer">
        <p>Lagunlar Framework Demo - {{ currentYear }}</p>
      </footer>
    </div>
  `
}
class AppComponentClass {
  constructor() {
    this.isLoggedIn = false;
    this.currentYear = new Date().getFullYear();
    this.authService = null;
  }
  
  ngOnInit() {
    // Obtener el servicio de autenticación
    this.authService = window.services && window.services.authService;
    
    // Comprobar si el usuario está autenticado
    if (this.authService) {
      this.isLoggedIn = this.authService.isAuthenticated();
      
      // Suscribirse a cambios en el estado de autenticación
      this.authService.onAuthChange((isAuthenticated) => {
        this.isLoggedIn = isAuthenticated;
        this.markForCheck();
      });
    }
    
    // Configurar botones de login/logout
    this.setupAuthButtons();
  }
  
  setupAuthButtons() {
    // Configurar botón de login
    setTimeout(() => {
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          if (this.authService) {
            this.authService.login();
            this.isLoggedIn = true;
            this.markForCheck();
          }
        });
      }
      
      // Configurar botón de logout
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (this.authService) {
            this.authService.logout();
            this.isLoggedIn = false;
            this.markForCheck();
          }
        });
      }
    }, 0);
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const AppComponent = Component(componentConfig)(AppComponentClass);
