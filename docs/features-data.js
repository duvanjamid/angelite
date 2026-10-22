// Comparison data for benchmarks.html. Evidence: V = verified by running/reading packages, D = official docs, G = general knowledge (verify before quoting).
window.FEATURES = {
 "legend": {
  "y": "Sí / integrado",
  "p": "Parcial, limitado o paquete aparte",
  "n": "No"
 },
 "evidence": {
  "V": "Comprobado en esta sesión: ejecutando el código o leyendo el paquete instalado",
  "D": "Según la documentación oficial",
  "G": "Conocimiento general, no comprobado en esta sesión"
 },
 "frameworks": [
  [
   "lite",
   "AngeLite Lite"
  ],
  [
   "preact",
   "Preact"
  ],
  [
   "vue",
   "Vue"
  ],
  [
   "react",
   "React"
  ],
  [
   "angular",
   "Angular"
  ]
 ],
 "versions": "React 19.3.1, Preact 10.29.8, Vue 3.5.44, Angular 20.3",
 "groups": [
  {
   "title": "Seguridad",
   "rows": [
    {
     "name": "Texto escapado por defecto",
     "why": "Interpolar datos del usuario como texto nunca debe ejecutar HTML.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       ""
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "escapado por diseño"
      ]
     }
    },
    {
     "name": "Neutraliza URLs `javascript:` en atributos",
     "why": "Un `href` con datos del usuario es el XSS más común en frameworks.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "lista de esquemas permitidos; `trustUrl()` para esquemas propios"
      ],
      "preact": [
       "n",
       "las deja pasar"
      ],
      "vue": [
       "n",
       "las deja pasar"
      ],
      "react": [
       "y",
       "las reemplaza por un throw"
      ],
      "angular": [
       "y",
       "las sanea (`unsafe:`)"
      ]
     }
    },
    {
     "name": "No ejecuta handlers `on*` pasados como texto",
     "why": "Un `onclick` con una cadena es ejecución de código arbitrario.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "error de compilación (también en el AOT)"
      ],
      "preact": [
       "y",
       "no lo crea"
      ],
      "vue": [
       "n",
       ":onclick con texto crea el atributo"
      ],
      "react": [
       "y",
       "no lo crea"
      ],
      "angular": [
       "y",
       "lo prohíbe en el compilador"
      ]
     }
    },
    {
     "name": "Rechaza bindings peligrosos al compilar",
     "why": "`[onclick]`, `[srcdoc]`, o enlazar datos a `<script>`: mejor un error al construir que un agujero en producción.",
     "ev": "G",
     "cells": {
      "lite": [
       "y",
       "on*, srcdoc, outerHTML y bindings en script/style/base/link/meta: error de compilación (comprobado)"
      ],
      "preact": [
       "p",
       "no hay plantillas; onClick con texto se ignora (comprobado)"
      ],
      "vue": [
       "n",
       ":onclick con texto crea el atributo (comprobado)"
      ],
      "react": [
       "p",
       "onClick con texto se ignora (comprobado)"
      ],
      "angular": [
       "y",
       "rechaza enlazar a propiedades de evento (según su documentación)"
      ]
     }
    },
    {
     "name": "HTML solo con confianza explícita (o saneado)",
     "why": "Insertar HTML del usuario sin vigilar es XSS: lo seguro es que no se renderice salvo que lo marques.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "`trustHtml()` obligatorio; sin él se inserta como texto"
      ],
      "preact": [
       "p",
       "lo renderiza si se lo pasas (dangerouslySetInnerHTML)"
      ],
      "vue": [
       "p",
       "lo renderiza si se lo pasas (v-html)"
      ],
      "react": [
       "p",
       "lo renderiza si se lo pasas (dangerouslySetInnerHTML)"
      ],
      "angular": [
       "y",
       "DomSanitizer sanea las cadenas (según su documentación)"
      ]
     }
    },
    {
     "name": "Expresiones sin acceso a `window`/`document`",
     "why": "Si alguien controla una plantilla, no debería llegar al navegador entero.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "bloqueo por valor: window y document no llegan a la plantilla por ningún camino"
      ],
      "preact": [
       "y",
       "JSX es código, no hay expresiones en cadenas"
      ],
      "vue": [
       "y",
       "solo globales permitidas (window y document son undefined)"
      ],
      "react": [
       "y",
       "JSX es código, no hay expresiones en cadenas"
      ],
      "angular": [
       "y",
       "las expresiones solo ven el componente"
      ]
     }
    },
    {
     "name": "Funciona con CSP sin `unsafe-eval` (modo sin build)",
     "why": "Las políticas estrictas prohíben `eval` y `new Function`.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "sin eval ni new Function en ningún bundle"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "p",
       "la build con compilador usa new Function; la runtime-only no"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "AOT sí; el compilador JIT usa new Function"
      ]
     }
    },
    {
     "name": "Soporte de Trusted Types",
     "why": "Exigido por algunas políticas de seguridad empresariales.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "política `angelite` para plantillas y `trustHtml()`"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "p",
       "una referencia en runtime-dom"
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       "integrado en el sanitizer"
      ]
     }
    },
    {
     "name": "CSP para estilos inyectados (nonce)",
     "why": "Si el framework inyecta `<style>`, una CSP estricta lo bloquea.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "hojas de estilo construibles; si no, <style> con nonce"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "ngCspNonce"
      ]
     }
    },
    {
     "name": "Dependencias de runtime",
     "why": "Menos dependencias = menos superficie de cadena de suministro.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "0"
      ],
      "preact": [
       "y",
       "0"
      ],
      "vue": [
       "p",
       "5 (@vue/*)"
      ],
      "react": [
       "y",
       "1 (scheduler)"
      ],
      "angular": [
       "p",
       "tslib + peers (rxjs…)"
      ]
     }
    },
    {
     "name": "Política de seguridad y proceso de reporte",
     "why": "Saber cómo reportar y cómo se corrigen las vulnerabilidades.",
     "ev": "G",
     "cells": {
      "lite": [
       "y",
       "SECURITY.md con el modelo de confianza"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    }
   ]
  },
  {
   "title": "Velocidad y rendimiento",
   "rows": [
    {
     "name": "Actualizaciones de grano fino (señales)",
     "why": "Solo se toca lo que depende del dato que cambió.",
     "ev": "G",
     "cells": {
      "lite": [
       "y",
       ""
      ],
      "preact": [
       "p",
       "con @preact/signals, paquete aparte"
      ],
      "vue": [
       "y",
       "reactividad por proxies"
      ],
      "react": [
       "n",
       "re-renderiza; el Compiler lo mitiga"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Reordenado mínimo de listas",
     "why": "Mover solo los nodos necesarios al reordenar.",
     "ev": "G",
     "cells": {
      "lite": [
       "y",
       "subsecuencia creciente más larga"
      ],
      "preact": [
       "p",
       "diff con keys"
      ],
      "vue": [
       "y",
       "subsecuencia creciente más larga"
      ],
      "react": [
       "p",
       "diff con keys"
      ],
      "angular": [
       "y",
       "@for con track"
      ]
     }
    },
    {
     "name": "Delegación de eventos",
     "why": "Un solo listener en lugar de uno por elemento: menos memoria.",
     "ev": "G",
     "cells": {
      "lite": [
       "y",
       "en document"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "y",
       "en la raíz"
      ],
      "angular": [
       "n",
       ""
      ]
     }
    },
    {
     "name": "Optimización en build (hoisting, flags, auto-memo)",
     "why": "El compilador hace trabajo que el runtime no tiene que repetir.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "AOT precompila, sin hoisting ni flags"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "y",
       "patch flags y hoisting estático"
      ],
      "react": [
       "y",
       "React Compiler"
      ],
      "angular": [
       "y",
       "AOT estricto"
      ]
     }
    },
    {
     "name": "Renderizado concurrente / transiciones",
     "why": "Mantener la interfaz fluida con actualizaciones pesadas.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "n",
       ""
      ]
     }
    },
    {
     "name": "Carga diferida declarativa",
     "why": "Dividir el código y cargar partes bajo demanda.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "y",
       "lazy y Suspense con compat"
      ],
      "vue": [
       "y",
       "defineAsyncComponent"
      ],
      "react": [
       "y",
       "lazy y Suspense"
      ],
      "angular": [
       "y",
       "@defer con triggers"
      ]
     }
    },
    {
     "name": "Renderizado en servidor (SSR)",
     "why": "SEO y primer pintado rápido.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "p",
       "preact-render-to-string aparte"
      ],
      "vue": [
       "y",
       "@vue/server-renderer"
      ],
      "react": [
       "y",
       "react-dom/server"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Hidratación",
     "why": "Reusar el HTML del servidor en vez de re-crearlo.",
     "ev": "D",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "p",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "incluida la incremental"
      ]
     }
    },
    {
     "name": "Sin paso de build",
     "why": "Usarlo con un solo <script>.",
     "ev": "V",
     "cells": {
      "lite": [
       "y",
       "8,3 KB gzip con el compilador incluido"
      ],
      "preact": [
       "p",
       "con htm"
      ],
      "vue": [
       "y",
       "63,7 KB gzip la build con compilador"
      ],
      "react": [
       "p",
       "createElement sin JSX"
      ],
      "angular": [
       "n",
       "necesita compilador o CLI"
      ]
     }
    }
   ]
  },
  {
   "title": "Arquitectura y estructura",
   "rows": [
    {
     "name": "Inyección de dependencias con ámbitos",
     "why": "Servicios distintos por árbol de componentes y fáciles de sustituir en tests.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "inject() global, sin ámbitos"
      ],
      "preact": [
       "y",
       "Context"
      ],
      "vue": [
       "y",
       "provide/inject"
      ],
      "react": [
       "y",
       "Context"
      ],
      "angular": [
       "y",
       "inyectores jerárquicos"
      ]
     }
    },
    {
     "name": "Router con rutas anidadas, guards y lazy",
     "why": "Aplicaciones de varias pantallas.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "hash, parámetros y comodín"
      ],
      "preact": [
       "p",
       "preact-iso aparte"
      ],
      "vue": [
       "p",
       "vue-router oficial, aparte"
      ],
      "react": [
       "n",
       "react-router no es oficial"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Formularios reactivos",
     "why": "Validación y estado de formularios complejos.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "ngModel; los reactivos solo en el código antiguo"
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "p",
       "v-model"
      ],
      "react": [
       "p",
       "controlados y actions"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Cliente HTTP con interceptores",
     "why": "Peticiones con reintentos, cabeceras y errores centralizados.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Tipos de TypeScript oficiales",
     "why": "Autocompletado y errores en el editor.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       "sin .d.ts"
      ],
      "preact": [
       "y",
       "incluidos"
      ],
      "vue": [
       "y",
       "incluidos"
      ],
      "react": [
       "p",
       "@types/react aparte"
      ],
      "angular": [
       "y",
       "escrito en TS"
      ]
     }
    },
    {
     "name": "Chequeo de plantillas en compilación",
     "why": "Detectar errores de plantilla antes de ejecutar.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "y",
       "TSX"
      ],
      "vue": [
       "p",
       "vue-tsc"
      ],
      "react": [
       "y",
       "TSX"
      ],
      "angular": [
       "y",
       "strictTemplates"
      ]
     }
    },
    {
     "name": "Límites de error",
     "why": "Que un fallo no tumbe toda la aplicación.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "aísla cada binding y lo registra; sin boundary"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "ErrorHandler global"
      ]
     }
    },
    {
     "name": "Portales / teleport",
     "why": "Modales y menús fuera de su contenedor.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "p",
       "CDK overlay"
      ]
     }
    },
    {
     "name": "Animaciones y transiciones integradas",
     "why": "Entrada y salida de elementos.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "y",
       "Transition"
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Slots con nombre",
     "why": "Componentes con varias zonas de contenido.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "un único <ng-content>"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "select"
      ]
     }
    },
    {
     "name": "Referencias al DOM y a hijos",
     "why": "Acceder a un elemento o componente hijo.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "$el y ngAfterViewInit"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Internacionalización (i18n)",
     "why": "Traducciones y formatos por idioma.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "n",
       ""
      ],
      "vue": [
       "n",
       ""
      ],
      "react": [
       "n",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    }
   ]
  },
  {
   "title": "Ecosistema y herramientas",
   "rows": [
    {
     "name": "DevTools",
     "why": "Inspeccionar componentes y estado.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "y",
       "preact/devtools"
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Utilidades de testing oficiales",
     "why": "Probar componentes sin montar el navegador.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       "no exporta utilidades"
      ],
      "preact": [
       "y",
       "preact/test-utils"
      ],
      "vue": [
       "p",
       "@vue/test-utils aparte"
      ],
      "react": [
       "y",
       "react-dom/test-utils"
      ],
      "angular": [
       "y",
       "TestBed"
      ]
     }
    },
    {
     "name": "Mensajes de desarrollo (dev warnings)",
     "why": "Avisos útiles cuando se usa mal.",
     "ev": "V",
     "cells": {
      "lite": [
       "p",
       "setDebug y errores en consola"
      ],
      "preact": [
       "p",
       "preact/debug"
      ],
      "vue": [
       "y",
       "Vue warn"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "errores NG0xxx"
      ]
     }
    },
    {
     "name": "CLI, HMR y herramientas",
     "why": "Arrancar y desarrollar sin configurar.",
     "ev": "G",
     "cells": {
      "lite": [
       "p",
       "plugin de esbuild para AOT"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "p",
       "depende de Vite o Next"
      ],
      "angular": [
       "y",
       ""
      ]
     }
    },
    {
     "name": "Soporte de editor para plantillas",
     "why": "Autocompletado dentro de las plantillas.",
     "ev": "G",
     "cells": {
      "lite": [
       "n",
       ""
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       "Volar"
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       "language service"
      ]
     }
    },
    {
     "name": "Madurez, comunidad y estabilidad de API",
     "why": "Quién lo usa, qué garantías hay entre versiones.",
     "ev": "V",
     "cells": {
      "lite": [
       "n",
       "proyecto nuevo, sin garantía de API"
      ],
      "preact": [
       "y",
       ""
      ],
      "vue": [
       "y",
       ""
      ],
      "react": [
       "y",
       ""
      ],
      "angular": [
       "y",
       ""
      ]
     }
    }
   ]
  }
 ]
};
