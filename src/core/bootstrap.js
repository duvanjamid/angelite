/**
 * Bootstrap module for Lagunlar
 * Handles application initialization
 */

import { render } from './renderer.js';
import { createElement } from './vdom.js';

/**
 * Bootstrap a Lagunlar application
 * 
 * @param {Function} RootComponent - Root component class
 * @param {HTMLElement} container - DOM element to mount the app
 * @param {Object} options - Additional options
 * @returns {Object} Application instance
 */
export function bootstrap(RootComponent, container, options = {}) {
  if (!RootComponent) {
    throw new Error('Root component is required');
  }
  
  if (!container || !(container instanceof HTMLElement)) {
    throw new Error('Valid container element is required');
  }
  
  // Create root component VNode
  const rootVNode = createElement(RootComponent, {});
  
  // Render to container
  const rootDom = render(rootVNode, container);
  
  // Set up global app state
  const app = {
    root: rootDom,
    component: rootDom && rootDom._component ? rootDom._component : null,
    container,
    
    // Method to refresh the entire application
    refresh() {
      render(createElement(RootComponent, {}), container, rootDom);
    },
    
    // Method to destroy the application
    destroy() {
      // Call lifecycle hooks if available
      if (this.component && this.component.ngOnDestroy) {
        this.component.ngOnDestroy();
      }
      
      // Remove DOM
      if (this.root && this.container.contains(this.root)) {
        this.container.removeChild(this.root);
      }
    }
  };
  
  return app;
}
