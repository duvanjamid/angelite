/**
 * Todo Component for Lagunlar Test App
 */
import { Component } from '../../src/lagunlar.js';

export class TodoComponent {
    constructor() {
        this.todos = [];
        this.newTodo = '';
    }
    
    addTodo() {
        if (this.newTodo.trim()) {
            this.todos.push(this.newTodo);
            this.newTodo = '';
            this.updateView();
        }
    }
    
    removeTodo(index) {
        this.todos.splice(index, 1);
        this.updateView();
    }
    
    updateView() {
        // This would be handled by the framework in a real implementation
        const todoList = document.querySelector('.todo-list');
        if (todoList) {
            todoList.innerHTML = this.todos.map((todo, index) => `
                <div class="todo-item">
                    <span>${todo}</span>
                    <button class="remove-btn" onclick="this._todoComponent.removeTodo(${index})">X</button>
                </div>
            `).join('');
            
            // Add reference to component for event handlers
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn._todoComponent = this;
            });
        }
        
        // Clear input field
        const todoInput = document.querySelector('.todo-input');
        if (todoInput) {
            todoInput.value = this.newTodo;
        }
    }
    
    ngOnInit() {
        console.log('Todo component initialized');
    }
}

// Register Todo Component
Component({
    selector: 'app-todo',
    template: `
        <div>
            <h3>Todo Component</h3>
            <div class="todo-form">
                <input class="todo-input" type="text" [(ngModel)]="newTodo" placeholder="Add a new task...">
                <button (click)="addTodo()">Add</button>
            </div>
            <div class="todo-list">
                <div *ngFor="let todo of todos" class="todo-item">
                    <span>{{todo}}</span>
                    <button class="remove-btn" (click)="removeTodo(index)">X</button>
                </div>
            </div>
        </div>
    `
})(TodoComponent);
