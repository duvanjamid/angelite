/**
 * Sistema de enrutamiento para Lagunlar
 * Permite la navegación entre diferentes vistas de la aplicación
 */

import { markDirty } from '../core/change-detection.js';

/**
 * Clase Route - Define una ruta en la aplicación
 */
export class Route {
  /**
   * @param {Object} config - Configuración de la ruta
   * @param {string} config.path - Patrón de URL para la ruta (ej: 'users/:id')
   * @param {Function} config.component - Componente a mostrar para esta ruta
   * @param {Route[]} [config.children] - Rutas hijas
   * @param {Object} [config.data] - Datos adicionales para la ruta
   * @param {Function[]} [config.guards] - Guardias de ruta
   * @param {Function[]} [config.resolvers] - Resolvers para cargar datos antes de activar la ruta
   * @param {string} [config.redirectTo] - Ruta a la que redirigir
   * @param {boolean} [config.pathMatch] - Tipo de coincidencia ('full' o 'prefix')
   * @param {string} [config.outlet] - Nombre del outlet donde se mostrará el componente
   */
  constructor(config) {
    this.path = config.path || '';
    this.component = config.component;
    this.children = config.children || [];
    this.data = config.data || {};
    this.guards = config.guards || [];
    this.resolvers = config.resolvers || [];
    this.redirectTo = config.redirectTo;
    this.pathMatch = config.pathMatch || 'prefix';
    this.outlet = config.outlet || 'primary';
    this.loadChildren = config.loadChildren; // Para lazy loading
  }
}

/**
 * Clase Router - Gestiona la navegación y el estado de las rutas
 */
export class Router {
  constructor() {
    this.routes = [];
    this.currentUrl = '';
    this.currentRoute = null;
    this.params = {};
    this.queryParams = {};
    this.fragment = '';
    this.outlets = new Map();
    this.navigationListeners = [];
    this.defaultOutlet = 'primary';
    this.rootComponent = null;
    
    // Opciones de configuración
    this.options = {
      basePath: '',
      useHash: true
    };
    
    // No inicializamos automáticamente para permitir configurar opciones primero
  }
  
  /**
   * Inicializa el router
   */
  init() {
    // Escuchar cambios en la URL
    window.addEventListener('popstate', () => {
      this.handleUrlChange();
    });
    
    // Inicializar con la URL actual
    this.handleUrlChange();
  }
  
  /**
   * Configura las opciones del router
   * 
   * @param {Object} options - Opciones de configuración
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    console.log('Opciones del router:', this.options);
  }
  
  /**
   * Configura las rutas del router
   * 
   * @param {Route[]} routes - Rutas a configurar
   */
  setRoutes(routes) {
    this.routes = routes;
    
    // Imprimir rutas registradas para depuración
    console.log('Rutas registradas:');
    routes.forEach(route => {
      console.log(`- Ruta: ${route.path}, Componente: ${route.component ? route.component.name : 'desconocido'}`);
    });
    
    this.handleUrlChange();
  }
  
  /**
   * Maneja cambios en la URL
   */
  handleUrlChange() {
    let url;
    let fragment = '';
    const queryString = window.location.search;
    
    // Determinar la URL basada en las opciones de configuración
    if (this.options.useHash) {
      // Modo hash: usar el fragmento de la URL como ruta
      fragment = window.location.hash.slice(1);
      url = fragment || '/';
      console.log(`handleUrlChange - Modo hash - Fragmento: ${fragment}, URL: ${url}`);
    } else {
      // Modo HTML5: usar el pathname
      url = window.location.pathname;
      
      // Si hay un basePath configurado, quitarlo de la URL
      if (this.options.basePath && url.startsWith(this.options.basePath)) {
        url = url.substring(this.options.basePath.length) || '/';
      }
      
      // Si la URL contiene un nombre de archivo HTML o termina con /
      if (url.endsWith('.html') || url.endsWith('/')) {
        url = '/';
      }
      
      // Extraer fragmento en modo HTML5
      if (window.location.hash) {
        fragment = window.location.hash.slice(1);
      }
      
      console.log(`handleUrlChange - Modo HTML5 - URL: ${url}, Fragmento: ${fragment}`);
    }
    
    // Asegurarse de que la ruta comience con /
    if (!url.startsWith('/')) {
      url = `/${url}`;
    }
    
    this.currentUrl = url;
    this.fragment = fragment;
    this.parseQueryParams(queryString);
    
    // Encontrar la ruta que coincide con la URL
    const matchResult = this.matchRoute(url, this.routes);
    
    if (matchResult) {
      const { route, params } = matchResult;
      this.currentRoute = route;
      this.params = params;
      
      // Notificar a los listeners
      this.notifyNavigationListeners({
        url,
        route: this.currentRoute,
        params: this.params,
        queryParams: this.queryParams,
        fragment: this.fragment
      });
      
      // Actualizar la vista
      this.updateView();
    } else {
      console.error(`No se encontró ninguna ruta para la URL: ${url}`);
    }
  }
  
  /**
   * Busca una ruta que coincida con la URL
   * 
   * @param {string} url - URL a comparar
   * @param {Route[]} routes - Rutas a comprobar
   * @param {Object} parentParams - Parámetros de la ruta padre
   * @returns {Object|null} Resultado de la coincidencia (ruta y parámetros)
   */
  matchRoute(url, routes, parentParams = {}) {
    // Extraer solo la parte de la ruta después del dominio (ignorar el nombre del archivo HTML)
    let pathUrl = url;
    
    // Si la URL contiene un nombre de archivo HTML, ignorarlo
    if (url.includes('.html')) {
      // Usar la URL del navegador sin el nombre del archivo
      pathUrl = window.location.pathname.split('/').pop().includes('.') ? '/' : window.location.pathname;
      
      // Si hay un hash en la URL, usarlo como ruta
      if (window.location.hash) {
        pathUrl = window.location.hash.substring(1);
      }
    }
    
    // Normalizar URL - Eliminar la barra inicial para la comparación
    const normalizedUrl = pathUrl.startsWith('/') ? pathUrl.substring(1) : pathUrl;
    console.log(`matchRoute - URL normalizada: ${normalizedUrl}`);
    const urlSegments = normalizedUrl.split('/').filter(segment => segment);
    
    // Si la URL normalizada está vacía, buscar la ruta raíz
    if (!normalizedUrl) {
      for (const route of routes) {
        if (route.path === '' || route.path === '/') {
          console.log('Encontrada coincidencia con ruta raíz');
          return { route, params: {} };
        }
      }
    }
    
    // Buscar una coincidencia exacta primero
    for (const route of routes) {
      // Normalizar el path de la ruta
      const routePath = route.path.startsWith('/') ? route.path.substring(1) : route.path;
      
      // Comprobar coincidencia exacta (para rutas sin parámetros)
      if (normalizedUrl === routePath) {
        console.log(`Encontrada coincidencia exacta con ruta: ${route.path}`);
        return { route, params: {} };
      }
    }
    
    // Si no hay coincidencia exacta, intentar con matchPath
    for (const route of routes) {
      // Comprobar redirección
      if (route.redirectTo) {
        if (this.matchPath(normalizedUrl, route.path, route.pathMatch)) {
          // Realizar redirección
          this.navigate([route.redirectTo]);
          return null;
        }
        continue;
      }
      
      // Comprobar coincidencia de ruta
      const match = this.matchPath(normalizedUrl, route.path, route.pathMatch);
      
      if (match) {
        console.log(`Encontrada coincidencia con ruta: ${route.path} usando matchPath`);
        const params = { ...parentParams, ...match.params };
        
        // Si hay rutas hijas, intentar coincidir con ellas
        if (route.children && route.children.length > 0) {
          const remainingUrl = match.remainingUrl;
          
          if (remainingUrl) {
            const childMatch = this.matchRoute(remainingUrl, route.children, params);
            if (childMatch) {
              return childMatch;
            }
          }
        }
        
        // Si no hay coincidencia con rutas hijas o no hay rutas hijas, usar esta ruta
        return { route, params };
      }
    }
    
    // Si no se encuentra ninguna coincidencia, buscar una ruta comodín (**)
    for (const route of routes) {
      if (route.path === '**') {
        console.log('Usando ruta comodín ** como fallback');
        return { route, params: {} };
      }
    }
    
    return null;
  }
  
  /**
   * Comprueba si una URL coincide con un patrón de ruta
   * 
   * @param {string} url - URL a comprobar
   * @param {string} pattern - Patrón de ruta
   * @param {string} pathMatch - Tipo de coincidencia ('full' o 'prefix')
   * @returns {Object|null} Resultado de la coincidencia
   */
  matchPath(url, pattern, pathMatch) {
    // Caso especial: ruta raíz y patrón vacío
    if ((url === '/' || url === '') && (pattern === '' || pattern === '/')) {
      console.log(`Coincidencia especial encontrada para URL: ${url} y patrón: ${pattern}`);
      return { params: {}, remainingUrl: '' };
    }
    
    // Imprimir valores para depuración
    console.log(`Comparando URL: ${url} con patrón: ${pattern}`);
    
    // Normalizar URL y patrón - Eliminar barras iniciales para la comparación
    const normalizedUrl = url.startsWith('/') ? url.substring(1) : url;
    const normalizedPattern = pattern.startsWith('/') ? pattern.substring(1) : pattern;
    
    console.log(`URL normalizada: ${normalizedUrl}, Patrón normalizado: ${normalizedPattern}`);
    
    // Comparación directa para rutas exactas (sin parámetros)
    if (normalizedUrl === normalizedPattern) {
      console.log(`Coincidencia exacta encontrada: ${normalizedUrl} === ${normalizedPattern}`);
      return { params: {}, remainingUrl: '' };
    }
    
    // Dividir en segmentos
    const urlSegments = normalizedUrl.split('/').filter(segment => segment);
    const patternSegments = normalizedPattern.split('/').filter(segment => segment);
    
    // Para coincidencia completa, el número de segmentos debe ser igual
    if (pathMatch === 'full' && urlSegments.length !== patternSegments.length) {
      return null;
    }
    
    // Para coincidencia de prefijo, la URL debe tener al menos tantos segmentos como el patrón
    if (pathMatch === 'prefix' && urlSegments.length < patternSegments.length) {
      return null;
    }
    
    const params = {};
    
    // Comprobar cada segmento
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const urlSegment = urlSegments[i];
      
      // Si es un parámetro (comienza con :)
      if (patternSegment.startsWith(':')) {
        const paramName = patternSegment.slice(1);
        params[paramName] = urlSegment;
      }
      // Si es un segmento literal, debe coincidir exactamente
      else if (patternSegment !== urlSegment) {
        return null;
      }
    }
    
    // Calcular la URL restante para rutas anidadas
    let remainingUrl = '';
    if (pathMatch === 'prefix' && urlSegments.length > patternSegments.length) {
      remainingUrl = '/' + urlSegments.slice(patternSegments.length).join('/');
    }
    
    return {
      params,
      remainingUrl
    };
  }
  
  /**
   * Parsea los parámetros de consulta de la URL
   * 
   * @param {string} queryString - Cadena de consulta (ej: '?key=value&key2=value2')
   */
  parseQueryParams(queryString) {
    this.queryParams = {};
    
    if (!queryString || queryString === '?') return;
    
    // Eliminar el signo de interrogación inicial
    const query = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    
    // Dividir en pares clave-valor
    const pairs = query.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        this.queryParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    }
  }
  
  /**
   * Navega a una nueva URL
   * 
   * @param {Array|string} commands - Comandos de navegación (ej: ['users', userId] o '/users/123')
   * @param {Object} [extras] - Opciones adicionales
   * @param {Object} [extras.queryParams] - Parámetros de consulta
   * @param {string} [extras.fragment] - Fragmento de URL
   * @param {boolean} [extras.replaceUrl] - Si debe reemplazar la entrada en el historial
   * @returns {boolean} Si la navegación fue exitosa
   */
  navigate(commands, extras = {}) {
    let url;
    
    // Convertir comandos a URL
    if (Array.isArray(commands)) {
      url = '/' + commands.join('/');
    } else if (typeof commands === 'string') {
      url = commands;
    } else {
      throw new Error('Los comandos de navegación deben ser un array o una cadena');
    }
    
    // Añadir parámetros de consulta
    if (extras.queryParams) {
      const queryParts = [];
      for (const key in extras.queryParams) {
        const value = extras.queryParams[key];
        if (value !== null && value !== undefined) {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
      if (queryParts.length > 0) {
        url += `?${queryParts.join('&')}`;
      }
    }
    
    // Añadir fragmento
    if (extras.fragment) {
      url += `#${extras.fragment}`;
    }
    
    // Actualizar la URL en el navegador
    if (extras.replaceUrl) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    
    // Manejar el cambio de URL
    this.handleUrlChange();
  }
  
  /**
   * Obtiene un outlet por su nombre
   * 
   * @param {string} name - Nombre del outlet
   * @returns {HTMLElement} Elemento del outlet
   */
  getOutlet(name) {
    // Si ya tenemos una referencia al outlet, devolverla
    if (this.outlets.has(name)) {
      return this.outlets.get(name);
    }
    
    console.log(`Buscando outlet ${name} en el DOM`);
    
    // Buscar el elemento router-outlet con el nombre especificado
    let outlet;
    
    // Prioridad 1: Buscar un elemento con el atributo router-outlet="name"
    outlet = document.querySelector(`[router-outlet="${name}"]`);
    
    // Prioridad 2: Si buscamos el outlet primary, buscar un elemento <router-outlet> sin atributo
    if (!outlet && name === 'primary') {
      const routerOutlets = document.querySelectorAll('router-outlet');
      
      // Buscar un router-outlet sin nombre (que sería el primary por defecto)
      for (const element of routerOutlets) {
        if (!element.hasAttribute('name') && !element.hasAttribute('router-outlet')) {
          outlet = element;
          break;
        }
      }
    }
    
    // Prioridad 3: Buscar un elemento con el atributo name="name" dentro de un router-outlet
    if (!outlet) {
      outlet = document.querySelector(`router-outlet[name="${name}"]`);
    }
    
    if (outlet) {
      console.log(`Outlet ${name} encontrado: ${outlet.tagName}`);
      
      // Si es un router-outlet, preparar el contenedor para renderizar
      if (outlet.tagName.toLowerCase() === 'router-outlet') {
        // Crear un contenedor si no existe
        let container = outlet.querySelector('.router-outlet-container');
        
        if (!container) {
          container = document.createElement('div');
          container.classList.add('router-outlet-container');
          outlet.appendChild(container);
        }
        
        // Usar el contenedor como el outlet real
        outlet = container;
        console.log(`Usando contenedor para el outlet ${name}`);
      }
      
      // Marcar el elemento como outlet
      outlet.setAttribute('router-outlet', name);
      this.outlets.set(name, outlet);
      return outlet;
    }
    
    // Si todavía no se encuentra el outlet, crear uno temporal
    if (!outlet && this.rootComponent) {
      console.log(`Creando outlet ${name} temporal`);
      
      // Crear un contenedor temporal para el outlet
      outlet = document.createElement('div');
      outlet.setAttribute('router-outlet', name);
      outlet.classList.add('router-outlet-container');
      
      // Agregar el outlet al cuerpo del documento
      document.body.appendChild(outlet);
      
      // Registrar el outlet
      this.outlets.set(name, outlet);
      
      // Intentar mover el outlet a su ubicación correcta más tarde
      setTimeout(() => {
        const appRoot = document.querySelector('app-root');
        if (appRoot) {
          const main = appRoot.querySelector('main');
          if (main) {
            main.appendChild(outlet);
            console.log(`Outlet ${name} movido a su ubicación correcta`);
          }
        }
      }, 500);
      
      return outlet;
    }
    
    return null;
  }
  
  /**
   * Registra un outlet
   * 
   * @param {string} name - Nombre del outlet
   * @param {HTMLElement} element - Elemento del outlet
   */
  registerOutlet(name, element) {
    this.outlets.set(name, element);
  }
  
  /**
   * Actualiza la vista basada en la ruta actual
   */
  updateView() {
    if (!this.rootComponent || !this.currentRoute) {
      console.log('No hay componente raíz o ruta actual definida');
      return;
    }
    
    // Obtener el componente de la ruta
    const RouteComponent = this.currentRoute.component;
    
    if (!RouteComponent) {
      console.error('La ruta no tiene un componente definido');
      return;
    }
    
    // Obtener el outlet donde se mostrará el componente
    const outletName = this.currentRoute.outlet || this.defaultOutlet;
    const outlet = this.getOutlet(outletName);
    
    if (!outlet) {
      console.error(`No se encontró el outlet: ${outletName}`);
      return;
    }
    
    console.log(`Renderizando componente ${RouteComponent.name} para URL ${this.currentUrl} en outlet ${outletName}`);
    
    // Crear y renderizar el componente
    const routeComponentInstance = new RouteComponent();
    
    // Inyectar parámetros de ruta, etc.
    routeComponentInstance.router = this;
    routeComponentInstance.route = {
      params: this.params,
      queryParams: this.queryParams,
      fragment: this.fragment,
      data: this.currentRoute.data
    };
    
    // Limpiar el outlet
    outlet.innerHTML = '';
    
    // Obtener la plantilla del componente (puede estar en la instancia o en la clase)
    let template = routeComponentInstance._template;
    
    // Si no hay plantilla en la instancia, intentar obtenerla de la clase
    if (!template && RouteComponent._template) {
      template = RouteComponent._template;
      // Copiar la plantilla a la instancia para futuras referencias
      routeComponentInstance._template = template;
    }
    
    // Renderizar el componente en el outlet
    if (template) {
      console.log(`Renderizando plantilla de ${RouteComponent.name} en outlet ${outletName}`);
      
      // Marcar el outlet con la ruta actual para depuración
      outlet.setAttribute('current-route', this.currentUrl);
      
      // Renderizar la plantilla
      outlet.innerHTML = template;
      
      // Inicializar el componente
      if (routeComponentInstance.ngOnInit) {
        try {
          routeComponentInstance.ngOnInit();
        } catch (error) {
          console.error(`Error al inicializar el componente ${RouteComponent.name}:`, error);
        }
      }
      
      // Aplicar detección de cambios si está disponible
      if (routeComponentInstance.detectChanges) {
        try {
          routeComponentInstance.detectChanges();
        } catch (error) {
          console.error(`Error al detectar cambios en el componente ${RouteComponent.name}:`, error);
        }
      }
    } else {
      console.error(`El componente de ruta ${RouteComponent.name} no tiene una plantilla definida`);
    }
  }
  
  /**
   * Establece el componente raíz de la aplicación
   * 
   * @param {Object} component - Componente raíz
   */
  setRootComponent(component) {
    this.rootComponent = component;
  }
  
  /**
   * Añade un listener para eventos de navegación
   * 
   * @param {Function} listener - Función a llamar cuando ocurre una navegación
   * @returns {Function} Función para eliminar el listener
   */
  onNavigationEnd(listener) {
    this.navigationListeners.push(listener);
    
    // Devolver función para eliminar el listener
    return () => {
      this.navigationListeners = this.navigationListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notifica a los listeners de navegación
   * 
   * @param {Object} event - Evento de navegación
   */
  notifyNavigationListeners(event) {
    for (const listener of this.navigationListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error en listener de navegación:', e);
      }
    }
  }
}

/**
 * Instancia global del router
 */
export const router = new Router();

/**
 * Decorador RouterOutlet para marcar elementos como outlets de router
 * 
 * @param {string} [name] - Nombre del outlet
 * @returns {Function} Decorador de propiedad
 */
export function RouterOutlet(name = 'primary') {
  return function(target, propertyKey) {
    // Guardar el descriptor original
    const originalDescriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    
    // Crear un nuevo descriptor
    const descriptor = {
      get: function() {
        // Obtener el elemento
        const element = originalDescriptor ? originalDescriptor.get.call(this) : this[`_${propertyKey}`];
        
        // Registrar como outlet si es un elemento
        if (element instanceof HTMLElement) {
          // Marcar como outlet
          element.setAttribute('router-outlet', name);
          
          // Registrar en el router
          router.registerOutlet(name, element);
        }
        
        return element;
      },
      set: function(value) {
        // Si hay un setter original, usarlo
        if (originalDescriptor && originalDescriptor.set) {
          originalDescriptor.set.call(this, value);
        } else {
          this[`_${propertyKey}`] = value;
        }
        
        // Si es un elemento, registrarlo como outlet
        if (value instanceof HTMLElement) {
          // Marcar como outlet
          value.setAttribute('router-outlet', name);
          
          // Registrar en el router
          router.registerOutlet(name, value);
        }
      },
      enumerable: true,
      configurable: true
    };
    
    // Definir la propiedad con el nuevo descriptor
    Object.defineProperty(target, propertyKey, descriptor);
  };
}

/**
 * Decorador RouterLink para crear enlaces de navegación
 * 
 * @param {Array|string} commands - Comandos de navegación
 * @returns {Function} Decorador de propiedad
 */
export function RouterLink(commands) {
  return function(target, propertyKey) {
    // Guardar el descriptor original
    const originalDescriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    
    // Crear un nuevo descriptor
    const descriptor = {
      get: function() {
        // Obtener el elemento
        const element = originalDescriptor ? originalDescriptor.get.call(this) : this[`_${propertyKey}`];
        
        // Configurar como enlace de navegación si es un elemento
        if (element instanceof HTMLElement) {
          // Añadir atributo de enlace
          element.setAttribute('router-link', Array.isArray(commands) ? commands.join('/') : commands);
          
          // Añadir manejador de clic
          element.addEventListener('click', (event) => {
            event.preventDefault();
            router.navigate(commands);
          });
        }
        
        return element;
      },
      set: function(value) {
        // Si hay un setter original, usarlo
        if (originalDescriptor && originalDescriptor.set) {
          originalDescriptor.set.call(this, value);
        } else {
          this[`_${propertyKey}`] = value;
        }
        
        // Si es un elemento, configurarlo como enlace de navegación
        if (value instanceof HTMLElement) {
          // Añadir atributo de enlace
          value.setAttribute('router-link', Array.isArray(commands) ? commands.join('/') : commands);
          
          // Añadir manejador de clic
          value.addEventListener('click', (event) => {
            event.preventDefault();
            router.navigate(commands);
          });
        }
      },
      enumerable: true,
      configurable: true
    };
    
    // Definir la propiedad con el nuevo descriptor
    Object.defineProperty(target, propertyKey, descriptor);
  };
}

/**
 * Función para inicializar el router
 * 
 * @param {Route[]} routes - Rutas a configurar
 * @param {Object} rootComponent - Componente raíz
 * @param {Object} [options] - Opciones de configuración
 * @param {string} [options.basePath] - Ruta base de la aplicación
 * @param {boolean} [options.useHash] - Si es true, usar modo hash para navegación
 */
export function initializeRouter(routes, rootComponent, options = {}) {
  // Configurar opciones del router
  const defaultOptions = {
    basePath: '',
    useHash: true
  };
  
  const routerOptions = { ...defaultOptions, ...options };
  
  console.log('Inicializando router con opciones:', routerOptions);
  
  // Configurar el router
  router.setOptions(routerOptions);
  router.setRootComponent(rootComponent);
  router.setRoutes(routes);
  
  // Inicializar el router después de configurar todo
  router.init();
  
  // Forzar la navegación inicial
  router.handleUrlChange();
}
