/**
 * Servicio de autenticación
 */
import { Injectable } from '../../../src/decorators/injectable.js';

// Configuración del servicio
const serviceConfig = {
  providedIn: 'root'
}
export class AuthService {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.authListeners = [];
    
    // Comprobar si hay un usuario en localStorage
    this.checkLocalStorage();
    
    // Registrar el servicio globalmente para que esté disponible en la aplicación
    if (!window.services) {
      window.services = {};
    }
    
    window.services.authService = this;
  }
  
  /**
   * Comprueba si hay un usuario guardado en localStorage
   */
  checkLocalStorage() {
    const storedUser = localStorage.getItem('lagunlar_user');
    
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isLoggedIn = true;
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('lagunlar_user');
      }
    }
  }
  
  /**
   * Inicia sesión con un usuario
   * 
   * @param {Object} credentials - Credenciales de usuario
   * @returns {Object} Usuario autenticado
   */
  login(credentials = { username: 'demo', password: 'demo' }) {
    // En una aplicación real, aquí se haría una llamada a una API
    // Para este ejemplo, simplemente simulamos un inicio de sesión exitoso
    
    this.currentUser = {
      id: '1',
      username: credentials.username || 'demo',
      name: 'Usuario Demo',
      email: 'demo@example.com',
      role: 'admin',
      token: 'fake-jwt-token-' + Math.random().toString(36).substring(2)
    };
    
    this.isLoggedIn = true;
    
    // Guardar usuario en localStorage
    localStorage.setItem('lagunlar_user', JSON.stringify(this.currentUser));
    
    // Notificar a los listeners
    this.notifyAuthChange(true);
    
    return this.currentUser;
  }
  
  /**
   * Cierra la sesión del usuario actual
   */
  logout() {
    this.currentUser = null;
    this.isLoggedIn = false;
    
    // Eliminar usuario de localStorage
    localStorage.removeItem('lagunlar_user');
    
    // Notificar a los listeners
    this.notifyAuthChange(false);
  }
  
  /**
   * Comprueba si el usuario está autenticado
   * 
   * @returns {boolean} Si el usuario está autenticado
   */
  isAuthenticated() {
    return this.isLoggedIn;
  }
  
  /**
   * Obtiene el usuario actual
   * 
   * @returns {Object|null} Usuario actual o null
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Obtiene el token de autenticación
   * 
   * @returns {string|null} Token de autenticación o null
   */
  getToken() {
    return this.currentUser ? this.currentUser.token : null;
  }
  
  /**
   * Comprueba si el usuario tiene un rol específico
   * 
   * @param {string} role - Rol a comprobar
   * @returns {boolean} Si el usuario tiene el rol
   */
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }
  
  /**
   * Registra un listener para cambios en el estado de autenticación
   * 
   * @param {Function} listener - Función a llamar cuando cambia el estado
   * @returns {Function} Función para cancelar la suscripción
   */
  onAuthChange(listener) {
    this.authListeners.push(listener);
    
    // Devolver función para cancelar la suscripción
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notifica a los listeners de cambios en el estado de autenticación
   * 
   * @param {boolean} isAuthenticated - Nuevo estado de autenticación
   */
  notifyAuthChange(isAuthenticated) {
    for (const listener of this.authListeners) {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    }
  }
}

// Aplicar la configuración del servicio
Injectable(serviceConfig)(AuthService);
