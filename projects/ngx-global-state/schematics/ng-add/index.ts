import { Rule, SchematicContext, Tree, chain, schematic } from '@angular-devkit/schematics';
import { Schema } from '../init/schema'; // Usamos el schema de init para compatibilidad

/**
 * Regla ng-add que simplemente llama al schematic 'init'.
 * Esto permite que `ng add` y `ng generate init` compartan la misma lógica de configuración,
 * manteniendo `ng add` como un punto de entrada simple.
 *
 * @param options Opciones pasadas a `ng add` (p. ej., --appId).
 */
export function ngAdd(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Ejecutando `ng add` para @devalfe/ngx-global-state...');

    // La tarea principal de `ng add` es instalar las dependencias, lo cual el CLI hace automáticamente.
    // Después de la instalación, encadenamos la ejecución de nuestro schematic 'init'
    // para realizar la configuración del código.
    // Le pasamos las opciones de `ng-add` directamente a `init`.
    return chain([schematic('init', options)])(tree, context);
  };
}
