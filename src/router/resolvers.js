/**
 * Resolvers para Lagunlar Router
 * Permite cargar datos antes de activar una ruta
 */

/**
 * Interfaz para resolvers
 * Debe implementar el método resolve
 */
export class Resolver {
  /**
   * Resuelve datos para una ruta
   * 
   * @param {Object} route - Información de la ruta
   * @param {Object} state - Estado actual del router
   * @returns {*|Promise<*>} Datos resueltos
   */
  resolve(route, state) {
    return null;
  }
}

/**
 * Resolver de datos
 * Carga datos de un servicio antes de activar una ruta
 */
export class DataResolver extends Resolver {
  constructor(dataService) {
    super();
    this.dataService = dataService;
  }
  
  resolve(route, state) {
    // Obtener el ID del parámetro de ruta
    const id = route.params && route.params.id;
    
    // Si no hay ID, devolver null
    if (!id) {
      return null;
    }
    
    // Cargar datos del servicio
    return this.dataService.getById(id);
  }
}

/**
 * Resolver de lista
 * Carga una lista de datos de un servicio antes de activar una ruta
 */
export class ListResolver extends Resolver {
  constructor(dataService) {
    super();
    this.dataService = dataService;
  }
  
  resolve(route, state) {
    // Obtener parámetros de consulta
    const queryParams = route.queryParams || {};
    
    // Cargar lista de datos del servicio
    return this.dataService.getList(queryParams);
  }
}

/**
 * Resolver de usuario
 * Carga datos del usuario actual antes de activar una ruta
 */
export class UserResolver extends Resolver {
  constructor(authService) {
    super();
    this.authService = authService;
  }
  
  resolve(route, state) {
    // Comprobar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      return null;
    }
    
    // Cargar datos del usuario
    return this.authService.getCurrentUser();
  }
}

/**
 * Resolver combinado
 * Combina varios resolvers en uno
 */
export class CombinedResolver extends Resolver {
  constructor(resolvers) {
    super();
    this.resolvers = resolvers || [];
  }
  
  resolve(route, state) {
    // Resolver todos los resolvers
    const promises = this.resolvers.map(resolver => resolver.resolve(route, state));
    
    // Devolver un objeto con todos los resultados
    return Promise.all(promises).then(results => {
      const combinedResult = {};
      
      // Combinar resultados
      this.resolvers.forEach((resolver, index) => {
        const key = resolver.constructor.name.replace('Resolver', '').toLowerCase();
        combinedResult[key] = results[index];
      });
      
      return combinedResult;
    });
  }
}

/**
 * Decorador para crear resolvers
 * 
 * @param {Object} config - Configuración del resolver
 * @returns {Function} Decorador de clase
 */
export function ResolverDef(config = {}) {
  return function(target) {
    // Almacenar configuración en la clase
    target.resolverConfig = config;
    
    return target;
  };
}
