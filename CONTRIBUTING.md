# Guía para Contribuir a AngeLite

¡Gracias por tu interés en contribuir a AngeLite! Este documento proporciona las pautas y mejores prácticas para contribuir al proyecto.

## Código de Conducta

Al participar en este proyecto, te comprometes a mantener un ambiente respetuoso y colaborativo. Esperamos que todos los contribuyentes sean amables, pacientes y acogedores con los demás.

## Cómo Contribuir

Hay varias formas de contribuir a AngeLite:

1. **Reportar bugs**: Abre un issue describiendo el problema, cómo reproducirlo y el comportamiento esperado.
2. **Sugerir mejoras**: Propón nuevas características o mejoras a las existentes.
3. **Enviar código**: Implementa nuevas características o corrige bugs existentes.
4. **Mejorar la documentación**: Ayuda a mantener la documentación actualizada y clara.
5. **Compartir ejemplos**: Crea ejemplos de uso que muestren las capacidades de AngeLite.

## Proceso de Desarrollo

### Configuración del Entorno

1. Clona el repositorio:
   ```bash
   git clone git@github.com:duvanjamid/angelite.git
   cd angelite
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Ejecuta las pruebas:
   ```bash
   npm test
   ```

### Flujo de Trabajo con Git

1. Crea una rama para tu contribución:
   ```bash
   git checkout -b feature/nombre-de-tu-caracteristica
   ```
   o
   ```bash
   git checkout -b fix/nombre-del-bug
   ```

2. Realiza tus cambios siguiendo las convenciones de código.

3. Asegúrate de que las pruebas pasen:
   ```bash
   npm test
   ```

4. Haz commit de tus cambios con mensajes descriptivos:
   ```bash
   git commit -m "feat: añadir nueva directiva @defer"
   ```

5. Envía tu rama al repositorio remoto:
   ```bash
   git push origin feature/nombre-de-tu-caracteristica
   ```

6. Crea un Pull Request en GitHub.

## Convenciones de Código

### Estilo de Código

- Usa 2 espacios para la indentación.
- Usa punto y coma al final de cada declaración.
- Sigue el estilo de código existente en el proyecto.
- Usa nombres descriptivos para variables, funciones y clases.

### Convenciones de Commit

Seguimos el formato de [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: Nueva característica
- `fix`: Corrección de un bug
- `docs`: Cambios en la documentación
- `style`: Cambios que no afectan el significado del código (espacios, formato, etc.)
- `refactor`: Cambios en el código que no corrigen bugs ni añaden características
- `perf`: Cambios que mejoran el rendimiento
- `test`: Añadir o corregir pruebas
- `chore`: Cambios en el proceso de construcción o herramientas auxiliares

Ejemplo:
```
feat(router): añadir soporte para rutas anidadas
```

### Documentación

- Documenta todas las APIs públicas.
- Incluye ejemplos de uso cuando sea apropiado.
- Mantén la documentación actualizada cuando cambies el código.

## Pruebas

- Escribe pruebas para cualquier nueva característica o corrección de bug.
- Asegúrate de que todas las pruebas pasen antes de enviar un Pull Request.
- Cubre tanto los casos de éxito como los de error.

## Revisión de Código

- Todos los Pull Requests serán revisados por al menos un mantenedor del proyecto.
- Aborda todos los comentarios y sugerencias de la revisión.
- Sé respetuoso y constructivo en tus comentarios.

## Estructura del Proyecto

```
angelite/
├── src/                  # Código fuente
│   ├── core/             # Funcionalidad central
│   ├── decorators/       # Decoradores (@Component, @Directive, etc.)
│   ├── directives/       # Directivas incorporadas
│   ├── forms/            # Sistema de formularios
│   ├── pipes/            # Pipes para transformación de datos
│   └── router/           # Sistema de enrutamiento
├── examples/             # Ejemplos de uso
├── docs/                 # Documentación
├── test/                 # Pruebas
└── dist/                 # Archivos compilados (generados)
```

## Paleta de Colores

Cuando trabajes en componentes visuales o ejemplos, utiliza la paleta de colores oficial de AngeLite:

- **Primary Red**: `#bf3f27` - Acciones primarias y énfasis
- **Secondary Orange**: `#ef7b4f` - Elementos secundarios y destacados
- **Neutral Tan**: `#cb9573` - Fondos y elementos neutrales
- **Light Teal**: `#72a2ac` - Acentos y elementos de soporte
- **Dark Teal**: `#3d6c6f` - Texto y elementos oscuros de la interfaz

## Licencia

Al contribuir a este proyecto, aceptas que tus contribuciones estarán bajo la misma licencia que el proyecto (MIT).

---

¡Gracias por contribuir a AngeLite! Tu apoyo es fundamental para hacer de este framework una herramienta poderosa y fácil de usar para la comunidad.
