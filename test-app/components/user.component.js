/**
 * User Component for Lagunlar Test App
 */
import { Component } from '../../src/lagunlar.js';

export class UserComponent {
    constructor() {
        this.users = [];
        this.newUser = {
            name: '',
            email: ''
        };
    }
    
    addUser() {
        if (this.newUser.name.trim() && this.newUser.email.trim()) {
            this.users.push({...this.newUser});
            this.newUser = {
                name: '',
                email: ''
            };
            this.updateView();
        }
    }
    
    removeUser(index) {
        this.users.splice(index, 1);
        this.updateView();
    }
    
    updateView() {
        // This would be handled by the framework in a real implementation
        const userList = document.querySelector('.user-list');
        if (userList) {
            userList.innerHTML = this.users.map((user, index) => `
                <div class="user-item">
                    <span>${user.name} (${user.email})</span>
                    <button class="remove-btn" onclick="this._userComponent.removeUser(${index})">X</button>
                </div>
            `).join('');
            
            // Add reference to component for event handlers
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn._userComponent = this;
            });
        }
        
        // Clear input fields
        const nameInput = document.querySelector('.name-input');
        const emailInput = document.querySelector('.email-input');
        if (nameInput) nameInput.value = this.newUser.name;
        if (emailInput) emailInput.value = this.newUser.email;
    }
    
    ngOnInit() {
        console.log('User component initialized');
    }
}

// Register User Component
Component({
    selector: 'app-user',
    template: `
        <div>
            <h3>User Component</h3>
            <div class="user-form">
                <input class="name-input" type="text" placeholder="Name" [(ngModel)]="newUser.name">
                <input class="email-input" type="text" placeholder="Email" [(ngModel)]="newUser.email">
                <button (click)="addUser()">Add User</button>
            </div>
            <div class="user-list">
                <div *ngFor="let user of users" class="user-item">
                    <span>{{user.name}} ({{user.email}})</span>
                    <button class="remove-btn" (click)="removeUser(index)">X</button>
                </div>
            </div>
        </div>
    `
})(UserComponent);
