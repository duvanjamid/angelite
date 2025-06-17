/**
 * Guardias de ruta para Lagunlar Router
 * Permite controlar el acceso a las rutas
 */

/**
 * Interfaz para guardias de ruta
 * Debe implementar al menos uno de los métodos:
 * - canActivate: controla si se puede activar una ruta
 * - canDeactivate: controla si se puede desactivar una ruta
 * - canLoad: controla si se puede cargar un módulo de forma diferida
 */
export class RouteGuard {
  /**
   * Determina si una ruta puede ser activada
   * 
   * @param {Object} route - Información de la ruta
   * @param {Object} state - Estado actual del router
   * @returns {boolean|Promise<boolean>} Si la ruta puede ser activada
   */
  canActivate(route, state) {
    return true;
  }
  
  /**
   * Determina si una ruta puede ser desactivada
   * 
   * @param {Object} component - Instancia del componente actual
   * @param {Object} route - Información de la ruta
   * @param {Object} state - Estado actual del router
   * @returns {boolean|Promise<boolean>} Si la ruta puede ser desactivada
   */
  canDeactivate(component, route, state) {
    return true;
  }
  
  /**
   * Determina si un módulo puede ser cargado
   * 
   * @param {Object} route - Información de la ruta
   * @returns {boolean|Promise<boolean>} Si el módulo puede ser cargado
   */
  canLoad(route) {
    return true;
  }
}

/**
 * Guardia de autenticación
 * Controla el acceso a rutas que requieren autenticación
 */
export class AuthGuard extends RouteGuard {
  constructor(authService) {
    super();
    this.authService = authService;
  }
  
  canActivate(route, state) {
    // Comprobar si el usuario está autenticado
    return this.authService.isAuthenticated();
  }
}

/**
 * Guardia de roles
 * Controla el acceso a rutas que requieren roles específicos
 */
export class RoleGuard extends RouteGuard {
  constructor(authService) {
    super();
    this.authService = authService;
  }
  
  canActivate(route, state) {
    // Comprobar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      return false;
    }
    
    // Obtener los roles requeridos
    const requiredRoles = route.data && route.data.roles;
    
    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    // Comprobar si el usuario tiene alguno de los roles requeridos
    const userRoles = this.authService.getUserRoles();
    return requiredRoles.some(role => userRoles.includes(role));
  }
}

/**
 * Guardia de confirmación
 * Pide confirmación antes de abandonar una ruta
 */
export class ConfirmGuard extends RouteGuard {
  constructor(message = '¿Estás seguro de que quieres abandonar esta página?') {
    super();
    this.message = message;
  }
  
  canDeactivate(component, route, state) {
    // Si el componente tiene un método canDeactivate, usarlo
    if (component && typeof component.canDeactivate === 'function') {
      return component.canDeactivate();
    }
    
    // Si el componente tiene cambios sin guardar, pedir confirmación
    if (component && component.hasUnsavedChanges) {
      return window.confirm(this.message);
    }
    
    // Por defecto, permitir desactivación
    return true;
  }
}

/**
 * Guardia de feature flag
 * Controla el acceso a rutas basado en feature flags
 */
export class FeatureFlagGuard extends RouteGuard {
  constructor(featureFlagService) {
    super();
    this.featureFlagService = featureFlagService;
  }
  
  canActivate(route, state) {
    // Obtener el feature flag requerido
    const featureFlag = route.data && route.data.featureFlag;
    
    // Si no hay feature flag requerido, permitir acceso
    if (!featureFlag) {
      return true;
    }
    
    // Comprobar si el feature flag está habilitado
    return this.featureFlagService.isEnabled(featureFlag);
  }
}

/**
 * Decorador para crear guardias de ruta
 * 
 * @param {Object} config - Configuración del guardia
 * @returns {Function} Decorador de clase
 */
export function Guard(config = {}) {
  return function(target) {
    // Almacenar configuración en la clase
    target.guardConfig = config;
    
    return target;
  };
}
