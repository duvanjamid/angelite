/**
 * Componentes de Router para Lagunlar
 * Implementa componentes para facilitar el uso del router
 */

import { Component } from '../decorators/component.js';
import { Input } from '../decorators/input-output.js';
import { router } from './router.js';

/**
 * RouterOutletComponent - Componente que sirve como contenedor para las vistas de ruta
 * Uso: <router-outlet></router-outlet>
 */
// Se registrará el componente al final del archivo
export class RouterOutletComponent {
  constructor() {
    this.name = 'primary';
  }
  
  ngOnInit() {
    console.log('RouterOutletComponent inicializado');
    
    // Verificar que tenemos acceso al elemento
    if (!this.element) {
      console.error('RouterOutletComponent: No se encontró el elemento host');
      return;
    }
    
    // Crear un contenedor si no existe
    let container = this.getContainer();
    if (!container) {
      console.log('Creando contenedor para router-outlet');
      container = document.createElement('div');
      container.className = 'router-outlet-container';
      this.element.appendChild(container);
    }
    
    console.log('Registrando outlet en el router:', this.name, container);
    
    // Registrar como outlet en el router
    router.registerOutlet(this.name, container);
    
    // Actualizar la vista si ya hay una ruta activa
    if (router.currentRoute) {
      console.log('Actualizando vista con ruta actual:', router.currentRoute);
      router.updateView();
    } else {
      console.log('No hay ruta activa aún');
    }
  }
  
  getContainer() {
    // Buscar el elemento contenedor dentro del componente
    const container = this.element.querySelector('.router-outlet-container');
    return container;
  }
}

/**
 * RouterLinkComponent - Componente para crear enlaces de navegación
 * Uso: <router-link to="/ruta">Enlace</router-link>
 */
// Se registrará el componente al final del archivo
export class RouterLinkComponent {
  constructor() {
    this.to = '';
    this.queryParams = {};
    this.fragment = '';
    this.replaceUrl = false;
    this.activeClass = 'active';
    this.exactActiveClass = 'exact-active';
  }
  
  // Input property
  set to(value) {
    this._to = value;
    this.updateHref();
  }
  
  get to() {
    return this._to;
  }
  
  // Input property
  set queryParams(value) {
    this._queryParams = value;
    this.updateHref();
  }
  
  get queryParams() {
    return this._queryParams;
  }
  
  // Input property
  set fragment(value) {
    this._fragment = value;
    this.updateHref();
  }
  
  get fragment() {
    return this._fragment;
  }
  
  // Input property
  set replaceUrl(value) {
    this._replaceUrl = value === true || value === 'true';
  }
  
  get replaceUrl() {
    return this._replaceUrl;
  }
  
  // Input property
  set activeClass(value) {
    this._activeClass = value;
    this.updateActiveClass();
  }
  
  get activeClass() {
    return this._activeClass;
  }
  
  // Input property
  set exactActiveClass(value) {
    this._exactActiveClass = value;
    this.updateActiveClass();
  }
  
  get exactActiveClass() {
    return this._exactActiveClass;
  }
  
  ngOnInit() {
    // Obtener el elemento de enlace
    const link = this.getLink();
    
    // Configurar el enlace
    this.updateHref();
    
    // Añadir manejador de clic
    link.addEventListener('click', (event) => {
      event.preventDefault();
      
      // Navegar a la ruta
      router.navigate(this.to, {
        queryParams: this.queryParams,
        fragment: this.fragment,
        replaceUrl: this.replaceUrl
      });
    });
    
    // Suscribirse a cambios de ruta para actualizar la clase activa
    this.navigationSubscription = router.onNavigationEnd(() => {
      this.updateActiveClass();
    });
    
    // Actualizar la clase activa inicialmente
    this.updateActiveClass();
  }
  
  ngOnDestroy() {
    // Cancelar suscripción a cambios de ruta
    if (this.navigationSubscription) {
      this.navigationSubscription();
    }
  }
  
  getLink() {
    // Buscar el elemento de enlace dentro del componente
    return this.element.querySelector('.router-link');
  }
  
  updateHref() {
    const link = this.getLink();
    if (!link) return;
    
    // Construir la URL
    let url = this.to;
    
    // Añadir parámetros de consulta
    if (this.queryParams && Object.keys(this.queryParams).length > 0) {
      const queryParts = [];
      for (const key in this.queryParams) {
        const value = this.queryParams[key];
        if (value !== null && value !== undefined) {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
      if (queryParts.length > 0) {
        url += `?${queryParts.join('&')}`;
      }
    }
    
    // Añadir fragmento
    if (this.fragment) {
      url += `#${this.fragment}`;
    }
    
    // Actualizar el atributo href
    link.setAttribute('href', url);
  }
  
  updateActiveClass() {
    const link = this.getLink();
    if (!link) return;
    
    // Comprobar si la ruta actual coincide con la ruta del enlace
    const currentUrl = router.currentUrl;
    const linkUrl = this.to;
    
    // Eliminar clases activas
    link.classList.remove(this.activeClass);
    link.classList.remove(this.exactActiveClass);
    
    // Añadir clase activa si la ruta actual comienza con la ruta del enlace
    if (currentUrl.startsWith(linkUrl)) {
      link.classList.add(this.activeClass);
      
      // Añadir clase exactamente activa si la ruta actual es exactamente igual a la ruta del enlace
      if (currentUrl === linkUrl) {
        link.classList.add(this.exactActiveClass);
      }
    }
  }
}

/**
 * RouterLinkActiveDirective - Directiva para marcar elementos como activos cuando la ruta coincide
 * Uso: <a [routerLinkActive]="'active'">Enlace</a>
 */
export class RouterLinkActiveDirective {
  constructor() {
    this.element = null;
    this.routerLink = '';
    this.activeClass = 'active';
    this.exactActiveClass = '';
    this.navigationSubscription = null;
  }
  
  ngOnInit() {
    // Obtener el enlace del router
    this.routerLink = this.element.getAttribute('router-link') || '';
    
    // Suscribirse a cambios de ruta
    this.navigationSubscription = router.onNavigationEnd(() => {
      this.updateActiveClass();
    });
    
    // Actualizar la clase activa inicialmente
    this.updateActiveClass();
  }
  
  ngOnDestroy() {
    // Cancelar suscripción a cambios de ruta
    if (this.navigationSubscription) {
      this.navigationSubscription();
    }
  }
  
  updateActiveClass() {
    // Comprobar si la ruta actual coincide con la ruta del enlace
    const currentUrl = router.currentUrl;
    const linkUrl = this.routerLink;
    
    // Eliminar clases activas
    if (this.activeClass) {
      this.element.classList.remove(this.activeClass);
    }
    if (this.exactActiveClass) {
      this.element.classList.remove(this.exactActiveClass);
    }
    
    // Añadir clase activa si la ruta actual comienza con la ruta del enlace
    if (currentUrl.startsWith(linkUrl) && this.activeClass) {
      this.element.classList.add(this.activeClass);
      
      // Añadir clase exactamente activa si la ruta actual es exactamente igual a la ruta del enlace
      if (currentUrl === linkUrl && this.exactActiveClass) {
        this.element.classList.add(this.exactActiveClass);
      }
    }
  }
}

// Registrar componentes
export function registerRouterComponents() {
  console.log('Registrando componentes del router...');
  
  // Registrar RouterOutletComponent
  Component({
    selector: 'router-outlet',
    template: `<div class="router-outlet-container"></div>`
  })(RouterOutletComponent);
  console.log('RouterOutletComponent registrado');
  
  // Registrar RouterLinkComponent
  Component({
    selector: 'router-link',
    template: `<a href="{{to}}" class="router-link"><ng-content></ng-content></a>`
  })(RouterLinkComponent);
  console.log('RouterLinkComponent registrado');
  
  // Registrar atributos para enlaces de router
  const linkElements = document.querySelectorAll('[router-link]');
  console.log(`Encontrados ${linkElements.length} elementos con atributo router-link`);
  
  // Configurar los enlaces del router
  linkElements.forEach(element => {
    const href = element.getAttribute('href');
    if (href) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Navegando a: ${href}`);
        router.navigate(href);
      });
      console.log(`Enlace configurado para: ${href}`);
    }
  });
  
  // Configurar observador de mutaciones para detectar nuevos enlaces
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.hasAttribute('router-link')) {
              setupRouterLink(node);
            }
            
            // Buscar elementos anidados
            const childLinks = node.querySelectorAll('[router-link]');
            childLinks.forEach(setupRouterLink);
          }
        });
      }
    });
  });
  
  // Función para configurar un enlace de router
  function setupRouterLink(element) {
    const href = element.getAttribute('href');
    if (href) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Navegando a: ${href}`);
        router.navigate(href);
      });
      console.log(`Enlace configurado para: ${href}`);
    }
  }
  
  // Observar cambios en el DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Componentes del router registrados correctamente');
}
