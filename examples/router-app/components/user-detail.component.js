/**
 * Componente de detalle de usuario
 */
import { Component } from '../../../src/decorators/component.js';
import { router } from '../../../src/router/router.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-user-detail',
  template: `
    <div class="user-detail-container">
      <h2>Detalle de Usuario</h2>
      
      <div class="card" @if="loading">
        <p>Cargando información del usuario...</p>
      </div>
      
      <div class="card" @if="error">
        <h3>Error</h3>
        <p>{{ error }}</p>
        <button (click)="goBack()">Volver a la lista de usuarios</button>
      </div>
      
      <div @if="user && !loading && !error">
        <div class="card">
          <h3>{{ user.name }}</h3>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>Teléfono:</strong> {{ user.phone }}</p>
          <p><strong>Sitio web:</strong> {{ user.website }}</p>
          <p><strong>Empresa:</strong> {{ user.company.name }}</p>
        </div>
        
        <div class="card">
          <h3>Dirección</h3>
          <p><strong>Calle:</strong> {{ user.address.street }}</p>
          <p><strong>Ciudad:</strong> {{ user.address.city }}</p>
          <p><strong>Código postal:</strong> {{ user.address.zipcode }}</p>
        </div>
        
        <button (click)="goBack()">Volver a la lista de usuarios</button>
      </div>
    </div>
  `
};
class UserDetailComponentClass {
  constructor() {
    this.user = null;
    this.loading = true;
    this.error = null;
    this.userId = null;
    this.userService = null;
  }
  
  ngOnInit() {
    // Obtener el servicio de usuarios
    this.userService = window.services && window.services.userService;
    
    // Obtener el ID del usuario de los parámetros de ruta
    if (router && router.params) {
      this.userId = router.params.id;
      
      // Cargar usuario
      if (this.userService && this.userId) {
        this.loadUser(this.userId);
      } else {
        this.error = 'No se pudo obtener el servicio de usuarios o el ID del usuario';
        this.loading = false;
      }
    } else {
      this.error = 'No se pudieron obtener los parámetros de ruta';
      this.loading = false;
    }
  }
  
  loadUser(userId) {
    this.loading = true;
    this.error = null;
    
    // Simular carga asíncrona
    setTimeout(() => {
      try {
        this.user = this.userService.getUserById(userId);
        
        if (!this.user) {
          this.error = `No se encontró ningún usuario con ID ${userId}`;
        }
        
        this.loading = false;
      } catch (error) {
        this.error = `Error al cargar el usuario: ${error.message}`;
        this.loading = false;
      }
      
      // Actualizar la vista
      this.markForCheck();
    }, 1000);
  }
  
  goBack() {
    router.navigate(['/users']);
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const UserDetailComponent = Component(componentConfig)(UserDetailComponentClass);
