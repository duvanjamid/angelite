# API Reference - AngeLite

Esta documentación proporciona una referencia detallada de la API de AngeLite.

## Core API

### Component

El decorador `@Component` define una clase como un componente de AngeLite.

```javascript
@Component({
  selector: 'app-example',
  template: `<div>Contenido del componente</div>`,
  styles: `div { color: #3d6c6f; }`,
  providers: [ExampleService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ExampleComponent {
  // Implementación del componente
}
```

#### Opciones

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `selector` | `string` | Selector CSS que identifica este componente en una plantilla |
| `template` | `string` | Contenido HTML del componente |
| `styles` | `string` | Estilos CSS encapsulados para el componente |
| `providers` | `array` | Servicios que este componente pone a disposición de sus hijos |
| `changeDetection` | `ChangeDetectionStrategy` | Estrategia de detección de cambios |

### Directive

El decorador `@Directive` define una clase como una directiva de AngeLite.

```javascript
@Directive({
  selector: '[appHighlight]'
})
class HighlightDirective {
  constructor(element) {
    this.element = element;
  }
  
  @HostListener('mouseenter')
  onMouseEnter() {
    this.highlight('#bf3f27');
  }
  
  @HostListener('mouseleave')
  onMouseLeave() {
    this.highlight(null);
  }
  
  highlight(color) {
    this.element.style.backgroundColor = color;
  }
}
```

#### Opciones

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `selector` | `string` | Selector CSS que identifica esta directiva en una plantilla |
| `providers` | `array` | Servicios que esta directiva pone a disposición |

### Injectable

El decorador `@Injectable` marca una clase como disponible para ser inyectada como dependencia.

```javascript
@Injectable()
class UserService {
  getUsers() {
    return fetch('/api/users').then(response => response.json());
  }
}
```

## Comunicación entre Componentes

### Input

El decorador `@Input()` define una propiedad de entrada que puede recibir datos del componente padre.

```javascript
@Component({
  selector: 'app-child',
  template: `<div>{{ message }}</div>`
})
class ChildComponent {
  @Input() message = 'Default message';
}
```

Uso en el componente padre:

```html
<app-child [message]="parentMessage"></app-child>
```

### Output

El decorador `@Output()` define un evento que puede ser escuchado por el componente padre.

```javascript
@Component({
  selector: 'app-child',
  template: `<button (click)="sendMessage()">Send Message</button>`
})
class ChildComponent {
  @Output() messageEvent = new EventEmitter();
  
  sendMessage() {
    this.messageEvent.emit('Hello from child!');
  }
}
```

Uso en el componente padre:

```html
<app-child (messageEvent)="handleMessage($event)"></app-child>
```

## Directivas Estructurales

### @if

```html
@if (condition) {
  <div>Contenido cuando la condición es verdadera</div>
} @else {
  <div>Contenido cuando la condición es falsa</div>
}
```

### @for

```html
@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}
```

### @switch

```html
@switch (value) {
  @case (1) {
    <div>Caso 1</div>
  }
  @case (2) {
    <div>Caso 2</div>
  }
  @default {
    <div>Caso por defecto</div>
  }
}
```

## Pipes

Los pipes transforman datos para su visualización.

```html
{{ value | uppercase }}
{{ date | date:'short' }}
{{ price | currency:'USD' }}
```

### Pipes Incorporados

- `uppercase` - Convierte texto a mayúsculas
- `lowercase` - Convierte texto a minúsculas
- `date` - Formatea fechas
- `currency` - Formatea valores monetarios
- `decimal` - Formatea números decimales
- `percent` - Formatea porcentajes
- `json` - Convierte un objeto a JSON
- `slice` - Extrae una porción de un array o string
- `async` - Maneja valores asincrónicos (Promises, Observables)
- `titlecase` - Convierte texto a formato título

## Formularios

### FormControl

Representa un control individual en un formulario.

```javascript
const nameControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
```

### FormGroup

Agrupa controles de formulario relacionados.

```javascript
const userForm = new FormGroup({
  name: new FormControl('', Validators.required),
  email: new FormControl('', [Validators.required, Validators.email])
});
```

### Validators

Funciones para validar controles de formulario.

- `Validators.required` - Verifica que el campo no esté vacío
- `Validators.minLength(n)` - Verifica longitud mínima
- `Validators.maxLength(n)` - Verifica longitud máxima
- `Validators.pattern(regex)` - Verifica que el valor coincida con un patrón
- `Validators.email` - Verifica que el valor sea un email válido

## Router

### Route

Define una ruta en la aplicación.

```javascript
const routes = [
  { path: '', component: HomeComponent },
  { path: 'users', component: UserListComponent },
  { path: 'users/:id', component: UserDetailComponent },
  { path: '**', component: NotFoundComponent }
];
```

### RouterOutlet

Marca dónde se debe renderizar el componente de la ruta activa.

```html
<router-outlet></router-outlet>
```

### RouterLink

Crea enlaces de navegación.

```html
<a [routerLink]="['/users', user.id]">Ver detalles</a>
```

## Ciclo de Vida

Hooks que se ejecutan en momentos específicos del ciclo de vida de un componente.

- `onInit()` - Después de la inicialización del componente
- `onChanges(changes)` - Cuando cambian las propiedades de entrada
- `onDestroy()` - Antes de que el componente sea destruido
- `afterViewInit()` - Después de inicializar la vista
- `afterViewChecked()` - Después de cada verificación de la vista
- `afterContentInit()` - Después de inicializar el contenido proyectado
- `afterContentChecked()` - Después de cada verificación del contenido

## Detección de Cambios

### ChangeDetectionStrategy

Estrategias para detectar cambios en los componentes.

- `ChangeDetectionStrategy.Default` - Verifica todo el árbol de componentes
- `ChangeDetectionStrategy.OnPush` - Solo verifica cuando cambian las referencias de entrada

### Métodos de Control

- `markDirty(component)` - Marca un componente como sucio para forzar la detección de cambios
- `detectChanges(component)` - Ejecuta la detección de cambios para un componente
- `detachChangeDetection(component)` - Desconecta un componente de la detección de cambios
- `attachChangeDetection(component)` - Reconecta un componente a la detección de cambios
- `runOutsideChangeDetection(fn)` - Ejecuta código fuera del ciclo de detección de cambios
