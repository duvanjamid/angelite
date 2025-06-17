/**
 * Counter Component for Lagunlar Test App
 */
import { Component } from '../../src/lagunlar.js';

export class CounterComponent {
    constructor() {
        this.count = 0;
    }
    
    increment() {
        this.count++;
        this.updateView();
    }
    
    decrement() {
        this.count--;
        this.updateView();
    }
    
    double() {
        this.count *= 2;
        this.updateView();
    }
    
    reset() {
        this.count = 0;
        this.updateView();
    }
    
    updateView() {
        // This would be handled by the framework in a real implementation
        const counterValue = document.querySelector('.counter-value');
        if (counterValue) {
            counterValue.textContent = this.count;
        }
    }
    
    ngOnInit() {
        console.log('Counter component initialized');
    }
}

// Register Counter Component
Component({
    selector: 'app-counter',
    template: `
        <div>
            <h3>Counter Component</h3>
            <div class="counter-value">{{count}}</div>
            <div class="counter-actions">
                <button (click)="decrement()">-</button>
                <button (click)="increment()">+</button>
                <button (click)="double()">x2</button>
                <button (click)="reset()">Reset</button>
            </div>
        </div>
    `
})(CounterComponent);
