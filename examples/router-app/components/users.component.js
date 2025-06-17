/**
 * Componente de la página de usuarios
 */
import { Component } from '../../../src/decorators/component.js';

// Configuración del componente
const componentConfig = {
  selector: 'app-users',
  template: `
    <div class="users-container">
      <h2>Usuarios</h2>
      
      <div class="card">
        <h3>Lista de usuarios</h3>
        
        <div @if="loading">
          <p>Cargando usuarios...</p>
        </div>
        
        <div @if="error">
          <p class="error">{{ error }}</p>
        </div>
        
        <div @if="!loading && !error">
          <div class="user-list">
            <div @for="user of users" class="user-card">
              <h3>{{ user.name }}</h3>
              <p><strong>Email:</strong> {{ user.email }}</p>
              <p><strong>Teléfono:</strong> {{ user.phone }}</p>
              <p><a href="/users/{{ user.id }}" router-link>Ver detalles</a></p>
            </div>
          </div>
          
          <div @if="users.length === 0">
            <p>No hay usuarios disponibles.</p>
          </div>
        </div>
      </div>
    </div>
  `
};
class UsersComponentClass {
  constructor() {
    this.users = [];
    this.loading = true;
    this.error = null;
    this.userService = null;
  }
  
  ngOnInit() {
    // Obtener el servicio de usuarios
    this.userService = window.services && window.services.userService;
    
    // Cargar usuarios
    if (this.userService) {
      this.loadUsers();
    } else {
      this.error = 'No se pudo obtener el servicio de usuarios';
      this.loading = false;
    }
  }
  
  loadUsers() {
    this.loading = true;
    this.error = null;
    
    // Simular carga asíncrona
    setTimeout(() => {
      try {
        this.users = this.userService.getUsers();
        this.loading = false;
      } catch (error) {
        this.error = `Error al cargar usuarios: ${error.message}`;
        this.loading = false;
      }
      
      // Actualizar la vista
      this.markForCheck();
    }, 1000);
  }
}

// Aplicar la configuración del componente usando el decorador Component
export const UsersComponent = Component(componentConfig)(UsersComponentClass);
