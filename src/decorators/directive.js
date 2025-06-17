/**
 * Directive decorator for Lagunlar
 * Provides Angular-like directive functionality
 */

/**
 * Directive decorator factory
 * 
 * @param {Object} config - Directive configuration
 * @param {string} config.selector - CSS selector for the directive
 * @returns {Function} Directive decorator
 */
export function Directive(config) {
  return function(target) {
    // Validate configuration
    if (!config.selector) {
      throw new Error('Directive selector is required');
    }
    
    // Store directive metadata
    target._selector = config.selector;
    
    // Add lifecycle hooks if not present
    if (!target.prototype.ngOnInit) {
      target.prototype.ngOnInit = function() {};
    }
    
    if (!target.prototype.ngOnDestroy) {
      target.prototype.ngOnDestroy = function() {};
    }
    
    return target;
  };
}

/**
 * Legacy directive creation function (for browsers without decorator support)
 * 
 * @param {Object} config - Directive configuration
 * @param {Function} DirectiveClass - Directive class
 * @returns {Function} Enhanced directive class
 */
export function createDirective(config, DirectiveClass) {
  return Directive(config)(DirectiveClass);
}
