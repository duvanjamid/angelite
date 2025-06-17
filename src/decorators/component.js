/**
 * Component decorator for Lagunlar
 * Provides Angular-like component definition
 */

import { markDirty, ChangeDetectionStrategy } from '../core/change-detection.js';

/**
 * Component decorator factory
 * 
 * @param {Object} config - Component configuration
 * @param {string} config.selector - CSS selector for the component
 * @param {string} config.template - HTML template string
 * @param {string|string[]} config.styles - CSS styles for the component
 * @param {string} config.changeDetection - Estrategia de detección de cambios
 * @returns {Function} Component decorator
 */
export function Component(config) {
  return function(target) {
    // Validate configuration
    if (!config.selector) {
      throw new Error('Component selector is required');
    }
    
    if (!config.template) {
      throw new Error('Component template is required');
    }
    
    // Store component metadata
    target._selector = config.selector;
    target._template = config.template;
    
    // Process styles
    if (config.styles) {
      target._styles = Array.isArray(config.styles) 
        ? config.styles.join('\n') 
        : config.styles;
    }
    
    // Set change detection strategy
    target.prototype._changeDetectionStrategy = 
      config.changeDetection || ChangeDetectionStrategy.DEFAULT;
    
    // Add lifecycle hooks if not present
    if (!target.prototype.ngOnInit) {
      target.prototype.ngOnInit = function() {};
    }
    
    if (!target.prototype.ngOnDestroy) {
      target.prototype.ngOnDestroy = function() {};
    }
    
    if (!target.prototype.ngOnChanges) {
      target.prototype.ngOnChanges = function(changes) {};
    }
    
    if (!target.prototype.ngDoCheck) {
      target.prototype.ngDoCheck = function() {};
    }
    
    if (!target.prototype.ngAfterViewInit) {
      target.prototype.ngAfterViewInit = function() {};
    }
    
    if (!target.prototype.ngAfterViewChecked) {
      target.prototype.ngAfterViewChecked = function() {};
    }
    
    // Add component lifecycle methods
    if (!target.prototype.componentDidMount) {
      target.prototype.componentDidMount = function() {
        // Call ngOnInit by default
        this.ngOnInit();
        
        // Call ngAfterViewInit after DOM is ready
        setTimeout(() => {
          this.ngAfterViewInit();
          this.ngAfterViewChecked();
        }, 0);
      };
    }
    
    if (!target.prototype.componentWillUnmount) {
      target.prototype.componentWillUnmount = function() {
        // Call ngOnDestroy by default
        this.ngOnDestroy();
      };
    }
    
    // Add render method if not present
    if (!target.prototype.render) {
      target.prototype.render = function() {
        // This is a placeholder. The actual rendering is handled by the renderer
        return null;
      };
    }
    
    // Add change detection methods
    target.prototype.detectChanges = function() {
      // Ejecutar verificación de cambios
      this.ngDoCheck();
      
      // Actualizar la vista si es necesario
      if (this._updateView) {
        this._updateView();
        this.ngAfterViewChecked();
      }
    };
    
    // Add method to mark component for check
    target.prototype.markForCheck = function() {
      markDirty(this);
    };
    
    // Override setState to trigger change detection
    const originalSetState = target.prototype.setState || function(state) {
      Object.assign(this, state);
    };
    
    target.prototype.setState = function(state) {
      originalSetState.call(this, state);
      this.markForCheck();
    };
    
    return target;
  };
}

/**
 * Legacy component creation function (for browsers without decorator support)
 * 
 * @param {Object} config - Component configuration
 * @param {Function} ComponentClass - Component class
 * @returns {Function} Enhanced component class
 */
export function createComponent(config, ComponentClass) {
  return Component(config)(ComponentClass);
}
