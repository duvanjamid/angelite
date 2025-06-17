/**
 * Guardia de autenticación para proteger rutas
 */
import { Guard } from '../../../src/router/guards.js';
import { router } from '../../../src/router/router.js';

// Configuración del guardia que se aplicará al final del archivo
const guardConfig = {
  name: 'auth'
}
export class AuthGuard {
  constructor() {
    this.authService = null;
  }
  
  /**
   * Determina si una ruta puede ser activada
   * 
   * @param {Object} route - Información de la ruta
   * @param {Object} state - Estado actual del router
   * @returns {boolean} Si la ruta puede ser activada
   */
  canActivate(route, state) {
    // Obtener el servicio de autenticación
    this.authService = window.services && window.services.authService;
    
    // Comprobar si el usuario está autenticado
    if (this.authService && this.authService.isAuthenticated()) {
      return true;
    }
    
    // Si no está autenticado, mostrar un mensaje y redirigir al inicio
    alert('Necesitas iniciar sesión para acceder a esta página');
    
    // Redirigir al inicio
    router.navigate(['/home']);
    
    return false;
  }
}

// Aplicar la configuración del guardia manualmente
Guard(guardConfig)(AuthGuard);
