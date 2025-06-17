/**
 * Resolver para cargar datos de usuario antes de activar la ruta
 */
import { ResolverDef } from '../../../src/router/resolvers.js';

// Configuración del resolver que se aplicará al final del archivo
const resolverConfig = {
  name: 'user'
}
export class UserResolver {
  constructor() {
    this.userService = null;
  }
  
  /**
   * Resuelve datos para una ruta
   * 
   * @param {Object} route - Información de la ruta
   * @param {Object} state - Estado actual del router
   * @returns {Promise<Object>} Datos resueltos
   */
  resolve(route, state) {
    return new Promise((resolve, reject) => {
      // Obtener el servicio de usuarios
      this.userService = window.services && window.services.userService;
      
      if (!this.userService) {
        reject(new Error('No se pudo obtener el servicio de usuarios'));
        return;
      }
      
      // Obtener el ID del usuario de los parámetros de ruta
      const userId = route.params && route.params.id;
      
      if (!userId) {
        reject(new Error('No se especificó un ID de usuario'));
        return;
      }
      
      // Simular carga asíncrona
      setTimeout(() => {
        try {
          const user = this.userService.getUserById(userId);
          
          if (user) {
            resolve(user);
          } else {
            reject(new Error(`No se encontró ningún usuario con ID ${userId}`));
          }
        } catch (error) {
          reject(error);
        }
      }, 500);
    });
  }
}

// Aplicar la configuración del resolver manualmente
ResolverDef(resolverConfig)(UserResolver);
