# AngeLite

<div align="center">
  <img src="https://raw.githubusercontent.com/duvanjamid/angelite/main/assets/images/angelite-logo.svg" alt="AngeLite Logo" width="300">
  <p><strong>A lightweight Angular-inspired framework that runs directly in the browser</strong></p>
</div>

## Installation

```bash
npm install angelite
```

Or include it directly in your HTML:

```html
<script src="https://unpkg.com/angelite/dist/angelite.min.js"></script>
```

## Basic Usage

```javascript
import { Component, bootstrap } from 'angelite';

@Component({
  selector: 'app-counter',
  template: `
    <div>
      <h2>{{ title }}</h2>
      <p>Count: {{ count }}</p>
      <button (click)="increment()">Increment</button>
      <button (click)="decrement()">Decrement</button>
    </div>
  `
})
class CounterComponent {
  title = 'AngeLite Counter';
  count = 0;
  
  increment() {
    this.count++;
  }
  
  decrement() {
    if (this.count > 0) {
      this.count--;
    }
  }
}

// Bootstrap the application
document.addEventListener('DOMContentLoaded', () => {
  bootstrap(CounterComponent, document.getElementById('app'));
});
```

## Features

- **Zero Build Tools**: No compilation required
- **Modern Syntax**: Uses Angular-style decorators and syntax
- **Lightweight**: Small footprint for faster loading
- **Modern Directives**: Using @if, @for, @switch syntax
- **Reactive Forms**: Complete form validation system
- **Routing**: Client-side navigation
- **Pipes**: Transform data in templates
- **Component Communication**: Input/Output properties

## Documentation

For complete documentation, visit [the GitHub repository](https://github.com/duvanjamid/angelite).

## License

MIT
