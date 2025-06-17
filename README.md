# Lagunlar

A lightweight frontend framework with Angular's powerful features that runs directly in the browser without compilation while maintaining the capability to handle large-scale applications.

## Features

- **No Compilation Required**: Works directly in the browser
- **Component-Based Architecture**: Similar to Angular
- **Virtual DOM**: Efficient rendering with a lightweight virtual DOM
- **Decorators**: Angular-like component decorators
- **Directives**: Built-in directives for templating (ngIf, ngFor, etc.)
- **Two-Way Data Binding**: Using [(ngModel)]
- **Dependency Injection**: Simple DI system
- **Lifecycle Hooks**: Component lifecycle management
- **Event Handling**: Simplified event binding

## Getting Started

```html
<!DOCTYPE html>
<html>
<head>
  <title>Lagunlar App</title>
  <script src="dist/lagunlar.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    // Define a component
    @Component({
      selector: 'app-root',
      template: `
        <div>
          <h1>Hello, {{name}}!</h1>
          <button (click)="changeName()">Change Name</button>
        </div>
      `
    })
    class AppComponent {
      name = 'World';
      
      changeName() {
        this.name = 'Lagunlar';
      }
    }
    
    // Bootstrap the application
    Lagunlar.bootstrap(AppComponent, document.getElementById('app'));
  </script>
</body>
</html>
```

## Documentation

For more details, check out the documentation in the `/docs` directory.

## License

MIT
