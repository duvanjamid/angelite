/**
 * Injectable decorator for Lagunlar
 * Provides Angular-like dependency injection
 */

// Global service registry
const serviceRegistry = new Map();

/**
 * Injectable decorator factory
 * 
 * @param {Object} config - Injectable configuration
 * @param {string} config.providedIn - Scope of the service ('root', 'any', or null)
 * @returns {Function} Injectable decorator
 */
export function Injectable(config = { providedIn: 'root' }) {
  return function(target) {
    // Register the service if it should be provided in root
    if (config.providedIn === 'root') {
      // Create singleton instance
      const instance = new target();
      serviceRegistry.set(target, instance);
    }
    
    // Mark class as injectable
    target._injectable = true;
    target._providedIn = config.providedIn;
    
    return target;
  };
}

/**
 * Get a service instance from the registry
 * 
 * @param {Function} ServiceClass - Service class
 * @returns {Object} Service instance
 */
export function inject(ServiceClass) {
  if (!ServiceClass._injectable) {
    throw new Error(`${ServiceClass.name} is not injectable. Add @Injectable() decorator.`);
  }
  
  // Return existing instance if available
  if (serviceRegistry.has(ServiceClass)) {
    return serviceRegistry.get(ServiceClass);
  }
  
  // Create new instance if not provided in root
  const instance = new ServiceClass();
  
  // Store instance if it should be a singleton
  if (ServiceClass._providedIn === 'any') {
    serviceRegistry.set(ServiceClass, instance);
  }
  
  return instance;
}

/**
 * Legacy injectable creation function (for browsers without decorator support)
 * 
 * @param {Object} config - Injectable configuration
 * @param {Function} ServiceClass - Service class
 * @returns {Function} Enhanced service class
 */
export function createInjectable(config, ServiceClass) {
  return Injectable(config)(ServiceClass);
}
