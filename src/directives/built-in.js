/**
 * Built-in directives for Lagunlar
 * Provides Angular-like directive functionality
 */

import { Directive } from '../decorators/directive.js';
import { registerDirective } from './directive-processor.js';

/**
 * NgIf directive - conditionally renders elements
 * Usage: <div *ngIf="condition">Content</div>
 */
export class NgIf {
  constructor() {
    this.element = null;
    this.context = null;
    this.comment = null;
    this.template = null;
  }
  
  ngOnInit() {
    // Store original template
    this.template = this.element.outerHTML;
    
    // Get condition expression
    const condition = this.element.getAttribute('*ngIf');
    
    // Evaluate condition
    const result = this.evaluateExpression(condition);
    
    if (!result) {
      // Replace element with comment placeholder
      this.comment = document.createComment(`ngIf: ${condition}`);
      this.element.parentNode.replaceChild(this.comment, this.element);
    }
  }
  
  evaluateExpression(expr) {
    try {
      // Simple evaluation for demo
      if (expr.includes('.')) {
        const parts = expr.split('.');
        let value = this.context;
        
        for (const part of parts) {
          if (value === null || value === undefined) return false;
          value = value[part];
        }
        
        return Boolean(value);
      }
      
      return Boolean(this.context[expr]);
    } catch (e) {
      console.error('Error evaluating expression:', expr, e);
      return false;
    }
  }
}

// Register NgIf directive
registerDirective('*ngIf', NgIf);

/**
 * NgFor directive - repeats elements for each item in an array
 * Usage: <div *ngFor="let item of items">{{item}}</div>
 */
export class NgFor {
  constructor() {
    this.element = null;
    this.context = null;
    this.comment = null;
    this.template = null;
  }
  
  ngOnInit() {
    // Store original template
    this.template = this.element.outerHTML;
    
    // Get expression
    const expression = this.element.getAttribute('*ngFor');
    
    // Process ngFor
    this.processNgFor(expression);
  }
  
  processNgFor(expression) {
    // Parse "let item of items" syntax
    const match = expression.match(/let\s+(\w+)\s+of\s+(\w+)/);
    if (!match) return;
    
    const [, itemName, arrayName] = match;
    const array = this.context[arrayName];
    
    if (!Array.isArray(array)) return;
    
    // Create container
    const container = document.createElement('div');
    container.style.display = 'contents'; // Make container invisible
    
    // Create comment placeholder
    this.comment = document.createComment(`ngFor: ${expression}`);
    
    // Replace original element with comment
    const parent = this.element.parentNode;
    parent.replaceChild(this.comment, this.element);
    
    // Insert container after comment
    if (this.comment.nextSibling) {
      parent.insertBefore(container, this.comment.nextSibling);
    } else {
      parent.appendChild(container);
    }
    
    // Remove *ngFor attribute from template
    const template = this.template.replace(/\*ngFor="[^"]*"/, '');
    
    // Create elements for each item
    array.forEach((item, index) => {
      // Replace item variable in template
      let itemTemplate = template.replace(
        new RegExp(`{{\\s*${itemName}\\s*}}`, 'g'),
        item
      );
      
      // Replace index variable in template
      itemTemplate = itemTemplate.replace(
        new RegExp(`{{\\s*index\\s*}}`, 'g'),
        index
      );
      
      // Create element from template
      const div = document.createElement('div');
      div.innerHTML = itemTemplate;
      
      // Add to container
      while (div.firstChild) {
        container.appendChild(div.firstChild);
      }
    });
  }
}

// Register NgFor directive
registerDirective('*ngFor', NgFor);

/**
 * NgModel directive - provides two-way data binding
 * Usage: <input [(ngModel)]="property">
 */
export class NgModel {
  constructor() {
    this.element = null;
    this.context = null;
    this.property = null;
  }
  
  ngOnInit() {
    // Get property name
    this.property = this.element.getAttribute('[(ngModel)]');
    
    if (!this.property) return;
    
    // Set initial value
    this.element.value = this.context[this.property] || '';
    
    // Add input event listener
    this.element.addEventListener('input', this.handleInput.bind(this));
    
    // Add change event listener for non-text inputs
    if (this.element.type === 'checkbox' || this.element.type === 'radio' || this.element.tagName === 'SELECT') {
      this.element.addEventListener('change', this.handleChange.bind(this));
    }
  }
  
  handleInput(event) {
    // Update context property
    this.context[this.property] = event.target.value;
  }
  
  handleChange(event) {
    // Handle different input types
    if (event.target.type === 'checkbox') {
      this.context[this.property] = event.target.checked;
    } else if (event.target.type === 'radio') {
      this.context[this.property] = event.target.value;
    } else if (event.target.tagName === 'SELECT') {
      this.context[this.property] = event.target.value;
    }
  }
  
  ngOnDestroy() {
    // Remove event listeners
    this.element.removeEventListener('input', this.handleInput);
    this.element.removeEventListener('change', this.handleChange);
  }
}

// Register NgModel directive
registerDirective('[(ngModel)]', NgModel);
