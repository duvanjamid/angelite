// Documentation content for components.html (edit here to add or change a component page).
window.DOCS = [
  {
    "group": "Básicos",
    "items": [
      {
        "id": "button",
        "title": "Button",
        "tag": "<ui-button>",
        "desc": "Botón con variantes, tamaños, estado deshabilitado y carga.",
        "api": [
          {
            "name": "variant",
            "kind": "input",
            "type": "'default' | 'primary' | 'danger' | 'ghost'",
            "desc": "Estilo"
          },
          {
            "name": "size",
            "kind": "input",
            "type": "'sm' | 'md' | 'lg'",
            "desc": "Tamaño"
          },
          {
            "name": "disabled",
            "kind": "input",
            "type": "boolean",
            "desc": "Deshabilita"
          },
          {
            "name": "loading",
            "kind": "input",
            "type": "boolean",
            "desc": "Muestra spinner y deshabilita"
          }
        ],
        "code": "class Demo {\n  saving = signal(false);\n  save() { this.saving.set(true); setTimeout(() => this.saving.set(false), 1200); }\n}\ncomponent(Demo, {\n  imports: [ui.Button],\n  template: `\n    <ui-button>Default</ui-button>\n    <ui-button variant=\"primary\">Primary</ui-button>\n    <ui-button variant=\"danger\">Danger</ui-button>\n    <ui-button variant=\"ghost\">Ghost</ui-button>\n    <ui-button size=\"sm\">Small</ui-button>\n    <ui-button variant=\"primary\" [loading]=\"saving()\" (click)=\"save()\">Guardar</ui-button>`\n});\nmount(Demo, root);"
      },
      {
        "id": "badge",
        "title": "Badge",
        "tag": "<ui-badge>",
        "desc": "Etiqueta pequeña para estados y contadores.",
        "api": [
          {
            "name": "variant",
            "kind": "input",
            "type": "'default' | 'primary' | 'success' | 'warning' | 'danger'",
            "desc": "Color"
          }
        ],
        "code": "class Demo {}\ncomponent(Demo, {\n  imports: [ui.Badge],\n  template: `\n    <ui-badge>nuevo</ui-badge>\n    <ui-badge variant=\"primary\">12</ui-badge>\n    <ui-badge variant=\"success\">activo</ui-badge>\n    <ui-badge variant=\"warning\">pendiente</ui-badge>\n    <ui-badge variant=\"danger\">error</ui-badge>`\n});\nmount(Demo, root);"
      },
      {
        "id": "card",
        "title": "Card",
        "tag": "<ui-card>",
        "desc": "Contenedor con título opcional. El contenido se proyecta con <ng-content>.",
        "api": [
          {
            "name": "title",
            "kind": "input",
            "type": "string",
            "desc": "Título de la cabecera"
          }
        ],
        "code": "class Demo { n = signal(3); }\ncomponent(Demo, {\n  imports: [ui.Card, ui.Button],\n  template: `\n    <ui-card title=\"Resumen\">\n      Tienes {{ n() }} notificaciones.\n      <ui-button size=\"sm\" (click)=\"n.set(n() + 1)\">+1</ui-button>\n    </ui-card>`\n});\nmount(Demo, root);"
      },
      {
        "id": "alert",
        "title": "Alert",
        "tag": "<ui-alert>",
        "desc": "Mensaje contextual, descartable si se pide.",
        "api": [
          {
            "name": "type",
            "kind": "input",
            "type": "'info' | 'success' | 'warning' | 'error'",
            "desc": "Tipo"
          },
          {
            "name": "dismissible",
            "kind": "input",
            "type": "boolean",
            "desc": "Muestra la ×"
          },
          {
            "name": "closed",
            "kind": "output",
            "type": "—",
            "desc": "Se emite al cerrar"
          }
        ],
        "code": "class Demo { log = signal(''); }\ncomponent(Demo, {\n  imports: [ui.Alert],\n  template: `\n    <ui-alert>Información general.</ui-alert>\n    <ui-alert type=\"success\">Guardado correctamente.</ui-alert>\n    <ui-alert type=\"warning\" [dismissible]=\"true\" (closed)=\"log.set('Alerta cerrada')\">Cuidado, se puede cerrar.</ui-alert>\n    <small>{{ log() }}</small>`\n});\nmount(Demo, root);"
      },
      {
        "id": "avatar",
        "title": "Avatar",
        "tag": "<ui-avatar>",
        "desc": "Foto o iniciales calculadas del nombre.",
        "api": [
          {
            "name": "name",
            "kind": "input",
            "type": "string",
            "desc": "Nombre (para iniciales y title)"
          },
          {
            "name": "src",
            "kind": "input",
            "type": "string",
            "desc": "URL de imagen"
          },
          {
            "name": "size",
            "kind": "input",
            "type": "number",
            "desc": "Píxeles"
          }
        ],
        "code": "class Demo {}\ncomponent(Demo, {\n  imports: [ui.Avatar],\n  template: `\n    <ui-avatar name=\"Ada Lovelace\"></ui-avatar>\n    <ui-avatar name=\"Linus Torvalds\" [size]=\"48\"></ui-avatar>\n    <ui-avatar name=\"Grace\" [size]=\"28\"></ui-avatar>`\n});\nmount(Demo, root);"
      },
      {
        "id": "tooltip",
        "title": "Tooltip",
        "tag": "<ui-tooltip>",
        "desc": "Texto de ayuda al pasar el ratón (solo CSS).",
        "api": [
          {
            "name": "text",
            "kind": "input",
            "type": "string",
            "desc": "Contenido del tooltip"
          }
        ],
        "code": "class Demo {}\ncomponent(Demo, {\n  imports: [ui.Tooltip],\n  template: `Pasa el ratón sobre <ui-tooltip text=\"¡Hola desde el tooltip!\">esta palabra</ui-tooltip>.`\n});\nmount(Demo, root);"
      }
    ]
  },
  {
    "group": "Feedback",
    "items": [
      {
        "id": "progress",
        "title": "Progress, Spinner y Skeleton",
        "tag": "<ui-progress> <ui-spinner> <ui-skeleton>",
        "desc": "Indicadores de carga y progreso.",
        "api": [
          {
            "name": "value",
            "kind": "input",
            "type": "0–100",
            "desc": "Progress: porcentaje"
          },
          {
            "name": "height",
            "kind": "input",
            "type": "number",
            "desc": "Skeleton: alto en px"
          }
        ],
        "code": "class Demo {\n  value = signal(35);\n  change(delta) { this.value.set(Math.max(0, Math.min(100, this.value() + delta))); }\n}\ncomponent(Demo, {\n  imports: [ui.Progress, ui.Spinner, ui.Skeleton, ui.Button],\n  template: `\n    <ui-progress [value]=\"value()\"></ui-progress>\n    <p>\n      <ui-button size=\"sm\" (click)=\"change(-10)\">−10</ui-button>\n      <ui-button size=\"sm\" (click)=\"change(10)\">+10</ui-button>\n      {{ value() }}% <ui-spinner></ui-spinner>\n    </p>\n    <ui-skeleton [height]=\"14\"></ui-skeleton><br>\n    <ui-skeleton [height]=\"14\"></ui-skeleton>`\n});\nmount(Demo, root);"
      },
      {
        "id": "toast",
        "title": "Toast",
        "tag": "<ui-toasts> + ToastService",
        "desc": "Notificaciones efímeras. Se disparan desde cualquier sitio con el servicio compartido.",
        "api": [
          {
            "name": "ToastService.show(msg, type?, ms?)",
            "kind": "output",
            "type": "—",
            "desc": "Muestra un toast; devuelve su id"
          },
          {
            "name": "ToastService.dismiss(id)",
            "kind": "output",
            "type": "—",
            "desc": "Lo cierra"
          }
        ],
        "code": "const toasts = inject(ui.ToastService);\n\nclass Demo {\n  say(type) { toasts.show('Toast de tipo ' + type, type); }\n}\ncomponent(Demo, {\n  imports: [ui.Button, ui.Toasts],\n  template: `\n    <ui-button (click)=\"say('info')\">Info</ui-button>\n    <ui-button (click)=\"say('success')\">Éxito</ui-button>\n    <ui-button (click)=\"say('error')\">Error</ui-button>\n    <ui-toasts></ui-toasts>`\n});\nmount(Demo, root);"
      },
      {
        "id": "modal",
        "title": "Modal",
        "tag": "<ui-modal>",
        "desc": "Diálogo con fondo oscuro; se cierra con la × o clicando fuera.",
        "api": [
          {
            "name": "open",
            "kind": "input",
            "type": "boolean",
            "desc": "Visible"
          },
          {
            "name": "title",
            "kind": "input",
            "type": "string",
            "desc": "Título"
          },
          {
            "name": "closed",
            "kind": "output",
            "type": "—",
            "desc": "Petición de cierre"
          }
        ],
        "code": "class Demo { open = signal(false); name = signal('Ada'); }\ncomponent(Demo, {\n  imports: [ui.Modal, ui.Button],\n  template: `\n    <ui-button variant=\"primary\" (click)=\"open.set(true)\">Abrir modal</ui-button>\n    <ui-modal title=\"Hola\" [open]=\"open()\" (closed)=\"open.set(false)\">\n      <p>Hola, {{ name() }}. El contenido proyectado sigue vivo al reabrir.</p>\n      <ui-button (click)=\"open.set(false)\">Cerrar</ui-button>\n    </ui-modal>`\n});\nmount(Demo, root);"
      }
    ]
  },
  {
    "group": "Formularios",
    "items": [
      {
        "id": "toggle",
        "title": "Toggle",
        "tag": "<ui-toggle>",
        "desc": "Interruptor controlado.",
        "api": [
          {
            "name": "checked",
            "kind": "input",
            "type": "boolean",
            "desc": "Estado"
          },
          {
            "name": "label",
            "kind": "input",
            "type": "string",
            "desc": "Etiqueta"
          },
          {
            "name": "changed",
            "kind": "output",
            "type": "boolean",
            "desc": "Nuevo valor"
          }
        ],
        "code": "class Demo { on = signal(false); }\ncomponent(Demo, {\n  imports: [ui.Toggle],\n  template: `\n    <ui-toggle label=\"Notificaciones\" [checked]=\"on()\" (changed)=\"on.set($event)\"></ui-toggle>\n    <p>Valor: {{ on() }}</p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "text-field",
        "title": "Text field",
        "tag": "<ui-text-field>",
        "desc": "Campo de texto con etiqueta y error. Es un componente controlado.",
        "api": [
          {
            "name": "label",
            "kind": "input",
            "type": "string",
            "desc": ""
          },
          {
            "name": "value",
            "kind": "input",
            "type": "string",
            "desc": ""
          },
          {
            "name": "type",
            "kind": "input",
            "type": "string",
            "desc": "Tipo de input"
          },
          {
            "name": "placeholder",
            "kind": "input",
            "type": "string",
            "desc": ""
          },
          {
            "name": "error",
            "kind": "input",
            "type": "string",
            "desc": "Mensaje de error"
          },
          {
            "name": "valueChange",
            "kind": "output",
            "type": "string",
            "desc": "Cada pulsación"
          }
        ],
        "code": "class Demo {\n  email = signal('');\n  error = computed(() => this.email() && !this.email().includes('@') ? 'Falta la @' : '');\n}\ncomponent(Demo, {\n  imports: [ui.TextField],\n  template: `\n    <ui-text-field label=\"Email\" placeholder=\"tu@correo.com\"\n      [value]=\"email()\" [error]=\"error()\" (valueChange)=\"email.set($event)\"></ui-text-field>\n    <p>Escribiste: {{ email() }}</p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "select",
        "title": "Select",
        "tag": "<ui-select>",
        "desc": "Lista desplegable a partir de strings u objetos {value, label}.",
        "api": [
          {
            "name": "label",
            "kind": "input",
            "type": "string",
            "desc": ""
          },
          {
            "name": "options",
            "kind": "input",
            "type": "(string | {value,label})[]",
            "desc": ""
          },
          {
            "name": "value",
            "kind": "input",
            "type": "string",
            "desc": "Seleccionado"
          },
          {
            "name": "valueChange",
            "kind": "output",
            "type": "string",
            "desc": ""
          }
        ],
        "code": "class Demo {\n  country = signal('es');\n  options = [{ value: 'es', label: 'España' }, { value: 'mx', label: 'México' }, { value: 'co', label: 'Colombia' }];\n}\ncomponent(Demo, {\n  imports: [ui.Select],\n  template: `\n    <ui-select label=\"País\" [options]=\"options\" [value]=\"country()\" (valueChange)=\"country.set($event)\"></ui-select>\n    <p>Elegido: {{ country() }}</p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "rating",
        "title": "Rating",
        "tag": "<ui-rating>",
        "desc": "Valoración con estrellas.",
        "api": [
          {
            "name": "value",
            "kind": "input",
            "type": "number",
            "desc": ""
          },
          {
            "name": "max",
            "kind": "input",
            "type": "number",
            "desc": "Estrellas"
          },
          {
            "name": "valueChange",
            "kind": "output",
            "type": "number",
            "desc": ""
          }
        ],
        "code": "class Demo { stars = signal(3); }\ncomponent(Demo, {\n  imports: [ui.Rating],\n  template: `<ui-rating [value]=\"stars()\" (valueChange)=\"stars.set($event)\"></ui-rating> {{ stars() }}/5`\n});\nmount(Demo, root);"
      }
    ]
  },
  {
    "group": "Navegación",
    "items": [
      {
        "id": "tabs",
        "title": "Tabs",
        "tag": "<ui-tabs>",
        "desc": "Pestañas. El contenido lo muestras tú con bloques @if.",
        "api": [
          {
            "name": "tabs",
            "kind": "input",
            "type": "{id,label}[]",
            "desc": ""
          },
          {
            "name": "active",
            "kind": "input",
            "type": "string",
            "desc": "Id activo"
          },
          {
            "name": "activeChange",
            "kind": "output",
            "type": "string",
            "desc": ""
          }
        ],
        "code": "class Demo {\n  tabs = [{ id: 'a', label: 'General' }, { id: 'b', label: 'Seguridad' }, { id: 'c', label: 'Equipo' }];\n  active = signal('a');\n}\ncomponent(Demo, {\n  imports: [ui.Tabs],\n  template: `\n    <ui-tabs [tabs]=\"tabs\" [active]=\"active()\" (activeChange)=\"active.set($event)\"></ui-tabs>\n    <p>\n      @if (active() === 'a') {Ajustes generales.}\n      @else if (active() === 'b') {Contraseña y 2FA.}\n      @else {Miembros del equipo.}\n    </p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "accordion",
        "title": "Accordion",
        "tag": "<ui-accordion-item>",
        "desc": "Secciones plegables independientes.",
        "api": [
          {
            "name": "title",
            "kind": "input",
            "type": "string",
            "desc": ""
          }
        ],
        "code": "class Demo {}\ncomponent(Demo, {\n  imports: [ui.AccordionItem],\n  template: `\n    <ui-accordion-item title=\"¿Qué es AngeLite?\">Un núcleo Angular-style de ~9 KB basado en señales.</ui-accordion-item>\n    <ui-accordion-item title=\"¿Necesita compilar?\">No: plantillas en strings y un solo script.</ui-accordion-item>`\n});\nmount(Demo, root);"
      },
      {
        "id": "dropdown",
        "title": "Dropdown",
        "tag": "<ui-dropdown>",
        "desc": "Menú desplegable simple.",
        "api": [
          {
            "name": "label",
            "kind": "input",
            "type": "string",
            "desc": ""
          },
          {
            "name": "items",
            "kind": "input",
            "type": "string[]",
            "desc": ""
          },
          {
            "name": "picked",
            "kind": "output",
            "type": "string",
            "desc": "Opción elegida"
          }
        ],
        "code": "class Demo {\n  items = ['Editar', 'Duplicar', 'Eliminar'];\n  last = signal('—');\n}\ncomponent(Demo, {\n  imports: [ui.Dropdown],\n  template: `\n    <ui-dropdown label=\"Acciones\" [items]=\"items\" (picked)=\"last.set($event)\"></ui-dropdown>\n    <p>Última acción: {{ last() }}</p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "pagination",
        "title": "Pagination",
        "tag": "<ui-pagination>",
        "desc": "Paginador. Tú decides qué filas mostrar según la página actual.",
        "api": [
          {
            "name": "total",
            "kind": "input",
            "type": "number",
            "desc": "Elementos"
          },
          {
            "name": "pageSize",
            "kind": "input",
            "type": "number",
            "desc": ""
          },
          {
            "name": "page",
            "kind": "input",
            "type": "number",
            "desc": "Página (desde 1)"
          },
          {
            "name": "pageChange",
            "kind": "output",
            "type": "number",
            "desc": ""
          }
        ],
        "code": "class Demo {\n  page = signal(1);\n  total = 47;\n  range = computed(() => {\n    const from = (this.page() - 1) * 10 + 1;\n    return from + '–' + Math.min(this.page() * 10, this.total);\n  });\n}\ncomponent(Demo, {\n  imports: [ui.Pagination],\n  template: `\n    <ui-pagination [total]=\"total\" [pageSize]=\"10\" [page]=\"page()\" (pageChange)=\"page.set($event)\"></ui-pagination>\n    <p>Mostrando {{ range() }} de {{ total }}</p>`\n});\nmount(Demo, root);"
      },
      {
        "id": "stepper",
        "title": "Stepper",
        "tag": "<ui-stepper>",
        "desc": "Indicador de pasos.",
        "api": [
          {
            "name": "steps",
            "kind": "input",
            "type": "string[]",
            "desc": ""
          },
          {
            "name": "current",
            "kind": "input",
            "type": "number",
            "desc": "Índice activo (desde 0)"
          }
        ],
        "code": "class Demo {\n  step = signal(1);\n  steps = ['Cuenta', 'Perfil', 'Pago', 'Listo'];\n  move(d) { this.step.set(Math.max(0, Math.min(3, this.step() + d))); }\n}\ncomponent(Demo, {\n  imports: [ui.Stepper, ui.Button],\n  template: `\n    <ui-stepper [steps]=\"steps\" [current]=\"step()\"></ui-stepper>\n    <p>\n      <ui-button size=\"sm\" (click)=\"move(-1)\">Atrás</ui-button>\n      <ui-button size=\"sm\" variant=\"primary\" (click)=\"move(1)\">Siguiente</ui-button>\n    </p>`\n});\nmount(Demo, root);"
      }
    ]
  },
  {
    "group": "Datos",
    "items": [
      {
        "id": "table",
        "title": "Table",
        "tag": "<ui-table>",
        "desc": "Tabla con ordenación por columna (clic en la cabecera).",
        "api": [
          {
            "name": "columns",
            "kind": "input",
            "type": "{key,label}[]",
            "desc": ""
          },
          {
            "name": "rows",
            "kind": "input",
            "type": "object[]",
            "desc": ""
          }
        ],
        "code": "class Demo {\n  columns = [{ key: 'name', label: 'Nombre' }, { key: 'kb', label: 'KB (app del benchmark, min+gzip)' }];\n  rows = [\n    { name: 'AngeLite', kb: 8.4 },\n    { name: 'Preact', kb: 6.2 },\n    { name: 'Vue', kb: 25.6 },\n    { name: 'React', kb: 68.1 }\n  ];\n}\ncomponent(Demo, {\n  imports: [ui.Table],\n  template: `<ui-table [columns]=\"columns\" [rows]=\"rows\"></ui-table>`\n});\nmount(Demo, root);"
      }
    ]
  }
];
