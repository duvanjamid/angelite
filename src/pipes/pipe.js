/**
 * Sistema de Pipes para Lagunlar
 * Permite transformar datos en las plantillas
 */

// Registro global de pipes
const pipeRegistry = new Map();

// Exponer el registro de pipes para depuración
window.pipeRegistry = pipeRegistry;

/**
 * Devuelve una lista de los nombres de los pipes registrados
 * 
 * @returns {string[]} Lista de nombres de pipes
 */
export function getRegisteredPipes() {
  return Array.from(pipeRegistry.keys());
}

/**
 * Decorador Pipe para crear transformadores de datos
 * 
 * @param {Object} config - Configuración del pipe
 * @param {string} config.name - Nombre del pipe para usar en plantillas
 * @param {boolean} config.pure - Si es true (por defecto), solo se ejecuta cuando cambian los inputs
 * @returns {Function} Decorador de clase
 */
export function Pipe(config) {
  return function(target) {
    if (!config.name) {
      throw new Error('El pipe debe tener un nombre');
    }
    
    // Registrar el pipe globalmente
    pipeRegistry.set(config.name, {
      type: target,
      pure: config.pure !== false // Por defecto los pipes son puros
    });
    
    // Almacenar metadatos en la clase
    target.pipeName = config.name;
    target.isPure = config.pure !== false;
    
    return target;
  };
}

// Caché para pipes puros
const pipeCache = new WeakMap();

/**
 * Obtiene una instancia de un pipe por su nombre
 * 
 * @param {string} name - Nombre del pipe
 * @returns {Object} Instancia del pipe
 */
export function getPipe(name) {
  const pipeConfig = pipeRegistry.get(name);
  
  if (!pipeConfig) {
    throw new Error(`Pipe no encontrado: ${name}`);
  }
  
  const PipeClass = pipeConfig.type;
  
  // Para pipes puros, reutilizar instancias
  if (pipeConfig.pure) {
    let instance = pipeCache.get(PipeClass);
    if (!instance) {
      instance = new PipeClass();
      pipeCache.set(PipeClass, instance);
    }
    return instance;
  }
  
  // Para pipes impuros, crear nueva instancia cada vez
  return new PipeClass();
}

/**
 * Aplica un pipe a un valor
 * 
 * @param {string} pipeName - Nombre del pipe
 * @param {*} value - Valor a transformar
 * @param {Array} args - Argumentos adicionales para el pipe
 * @returns {*} Valor transformado
 */
export function applyPipe(pipeName, value, ...args) {
  try {
    // Verificar si el pipe existe
    if (!pipeRegistry.has(pipeName)) {
      console.error(`Pipe no encontrado: ${pipeName}. Pipes disponibles:`, getRegisteredPipes());
      return value; // Devolver el valor original si el pipe no existe
    }
    
    const pipe = getPipe(pipeName);
    
    if (typeof pipe.transform !== 'function') {
      console.error(`El pipe ${pipeName} no tiene un método transform`);
      return value;
    }
    
    // Aplicar el pipe y convertir el resultado a string si es necesario
    const result = pipe.transform(value, ...args);
    console.log(`Pipe '${pipeName}' aplicado: ${value} -> ${result}`);
    return result;
  } catch (e) {
    console.error(`Error al aplicar el pipe ${pipeName}:`, e);
    return value; // Devolver el valor original en caso de error
  }
}

/**
 * Procesa una expresión con pipes
 * Ejemplo: "user.name | uppercase | slice:0:10"
 * 
 * @param {string} expression - Expresión con pipes
 * @param {Object} context - Contexto para evaluar la expresión
 * @returns {*} Resultado de la expresión con pipes aplicados
 */
export function processPipeExpression(expression, context) {
  try {
    console.log(`Procesando expresión con pipes: ${expression}`);
    
    // Dividir la expresión por el operador de pipe |
    const parts = expression.split('|').map(part => part.trim());
    
    // La primera parte es la expresión base
    const baseExpr = parts[0];
    
    // Evaluar la expresión base
    let value = evaluateExpression(baseExpr, context);
    console.log(`Valor base para '${baseExpr}':`, value);
    
    // Aplicar cada pipe en secuencia
    for (let i = 1; i < parts.length; i++) {
      const pipePart = parts[i];
      
      // Separar el nombre del pipe y sus argumentos
      const pipeSegments = pipePart.split(':');
      const pipeName = pipeSegments[0].trim();
      const argExpressions = pipeSegments.slice(1).map(p => p.trim());
      
      console.log(`Aplicando pipe '${pipeName}' con argumentos:`, argExpressions);
      
      // Evaluar los argumentos
      const args = argExpressions.map(arg => {
        // Si el argumento es un número, convertirlo
        if (!isNaN(arg)) {
          return Number(arg);
        }
        
        // Si el argumento es una cadena entre comillas, extraer la cadena
        if ((arg.startsWith("'") && arg.endsWith("'")) || 
            (arg.startsWith('"') && arg.endsWith('"'))) {
          return arg.substring(1, arg.length - 1);
        }
        
        // De lo contrario, evaluar como expresión
        return evaluateExpression(arg, context);
      });
      
      // Usar directamente las instancias de pipes expuestas globalmente si están disponibles
      let pipeInstance;
      
      switch (pipeName) {
        case 'uppercase':
          if (window.uppercasePipe) {
            value = window.uppercasePipe.transform(value);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'lowercase':
          if (window.lowercasePipe) {
            value = window.lowercasePipe.transform(value);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'titlecase':
          if (window.titlecasePipe) {
            value = window.titlecasePipe.transform(value);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'date':
          if (window.datePipe) {
            value = window.datePipe.transform(value, ...args);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'currency':
          if (window.currencyPipe) {
            value = window.currencyPipe.transform(value, ...args);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'number':
          if (window.numberPipe) {
            value = window.numberPipe.transform(value, ...args);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'percent':
          if (window.percentPipe) {
            value = window.percentPipe.transform(value, ...args);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'json':
          if (window.jsonPipe) {
            value = window.jsonPipe.transform(value);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'slice':
          if (window.slicePipe) {
            value = window.slicePipe.transform(value, ...args);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
          
        case 'async':
          if (window.asyncPipe) {
            value = window.asyncPipe.transform(value);
            console.log(`Pipe '${pipeName}' aplicado directamente:`, value);
            continue;
          }
          break;
      }
      
      // Si no se encontró una instancia directa, intentar usar el sistema de registro
      try {
        const prevValue = value;
        value = applyPipe(pipeName, value, ...args);
        console.log(`Pipe '${pipeName}' aplicado a través del registro: ${prevValue} -> ${value}`);
      } catch (e) {
        console.error(`Error al aplicar el pipe '${pipeName}':`, e);
        // Si el pipe falla, mantener el valor anterior
      }
    }
    
    return value;
  } catch (e) {
    console.error('Error al procesar expresión con pipes:', expression, e);
    return expression; // Devolver la expresión original en caso de error
  }
}

/**
 * Evalúa una expresión en el contexto dado
 * 
 * @param {string} expr - Expresión a evaluar
 * @param {Object} context - Contexto para la evaluación
 * @returns {*} Resultado de la evaluación
 */
function evaluateExpression(expr, context) {
  try {
    // Manejar acceso a propiedades con notación de punto
    if (expr.includes('.')) {
      const parts = expr.split('.');
      let value = context;
      
      for (const part of parts) {
        if (value === null || value === undefined) return '';
        value = value[part];
        
        // Manejar llamadas a funciones
        if (typeof value === 'function') {
          value = value.call(context);
        }
      }
      
      return value;
    }
    
    // Manejar acceso simple a propiedades
    return context[expr];
  } catch (e) {
    console.error('Error evaluando expresión:', expr, e);
    return '';
  }
}
