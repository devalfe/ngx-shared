import { Rule, SchematicContext, Tree, SchematicsException } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { ProjectType } from '@schematics/angular/utility/workspace-models';
import * as ts from 'typescript';
import { Schema } from './schema';
import { insertImport } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';

// Constantes para los nombres de los providers
const GLOBAL_STATE_PROVIDER = 'provideGlobalState';
const MESSAGE_BUS_PROVIDER = 'provideMessageBus';
const LIB_NAME = '@devalfe/ngx-global-state';

/**
 * Schematic principal para configurar ngx-global-state.
 */
export function init(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    context.logger.info('🚀 Inicializando @devalfe/ngx-global-state...');

    const workspace = await getWorkspace(tree);
    const projectName = workspace.extensions.defaultProject as string;
    const project = workspace.projects.get(projectName);

    if (!project) {
      throw new SchematicsException(`Proyecto '${projectName}' no encontrado.`);
    }
    if (project.extensions.projectType !== ProjectType.Application) {
      throw new SchematicsException(
        'El schematic solo puede ejecutarse en un proyecto de tipo "application".',
      );
    }

    // 1. Encontrar el archivo de configuración principal (app.config.ts o main.ts)
    const bootstrapFilePath = findBootstrapFile(tree, project.sourceRoot || 'src');
    const sourceText = tree.readText(bootstrapFilePath);
    const sourceFile = ts.createSourceFile(
      bootstrapFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    // 2. Construir las llamadas a los providers con sus opciones
    const globalStateOptions = buildOptionsString({
      persistence: options.persistence,
      crossApp: options.crossApp,
      channelPrefix: options.channelPrefix,
    });

    const messageBusOptions = buildOptionsString({
      appId: options.appId,
    });

    const globalStateCall = `${GLOBAL_STATE_PROVIDER}(${globalStateOptions})`;
    const messageBusCall = `${MESSAGE_BUS_PROVIDER}(${messageBusOptions})`;

    // 3. Preparar los cambios para el AST
    const recorder = tree.beginUpdate(bootstrapFilePath);

    // 3.1. Añadir imports si no existen
    const imports = [GLOBAL_STATE_PROVIDER, MESSAGE_BUS_PROVIDER]
      .map((providerName) => insertImport(sourceFile, bootstrapFilePath, providerName, LIB_NAME))
      .filter((change): change is InsertChange => change instanceof InsertChange);

    for (const change of imports) {
      recorder.insertLeft(change.pos, change.toAdd);
    }

    // 3.2. Encontrar el array de providers y añadir las llamadas
    const providersNode = findProvidersArray(sourceFile);
    if (!providersNode) {
      throw new SchematicsException(
        `No se pudo encontrar el array 'providers' en ${bootstrapFilePath}.`,
      );
    }

    const textToAdd = `\n    ${globalStateCall},\n    ${messageBusCall},\n  `;
    const providerChange = new InsertChange(
      bootstrapFilePath,
      providersNode.getStart() + 1,
      textToAdd,
    );
    recorder.insertLeft(providerChange.pos, providerChange.toAdd);

    // 4. Aplicar los cambios
    tree.commitUpdate(recorder);

    context.logger.info('✅ @devalfe/ngx-global-state inicializado exitosamente!');
    return tree;
  };
}

/**
 * Busca el archivo de bootstrap principal, probando con app.config.ts y luego main.ts.
 */
function findBootstrapFile(tree: Tree, sourceRoot: string): string {
  const standalonePath = `${sourceRoot}/app/app.config.ts`;
  if (tree.exists(standalonePath)) {
    return standalonePath;
  }

  const mainPath = `${sourceRoot}/main.ts`;
  if (tree.exists(mainPath)) {
    return mainPath;
  }

  throw new SchematicsException(
    'No se pudo encontrar un archivo de configuración (app.config.ts o main.ts).',
  );
}

/**
 * Encuentra el nodo del array 'providers' en un archivo de configuración.
 */
function findProvidersArray(sourceFile: ts.SourceFile): ts.ArrayLiteralExpression | undefined {
  let providersNode: ts.ArrayLiteralExpression | undefined;

  const visit = (node: ts.Node) => {
    // Para app.config.ts: busca `providers: [...]`
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === 'providers' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      providersNode = node.initializer;
    }
    // Para main.ts: busca `bootstrapApplication(App, { providers: [...] })`
    else if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'bootstrapApplication'
    ) {
      const appConfig = node.arguments[1];
      if (appConfig && ts.isObjectLiteralExpression(appConfig)) {
        const providersProp = appConfig.properties.find(
          (p) => p.name?.getText(sourceFile) === 'providers',
        );
        if (
          providersProp &&
          ts.isPropertyAssignment(providersProp) &&
          ts.isArrayLiteralExpression(providersProp.initializer)
        ) {
          providersNode = providersProp.initializer;
        }
      }
    }

    if (!providersNode) {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return providersNode;
}

/**
 * Construye un string de opciones a partir de un objeto, omitiendo valores undefined.
 */
function buildOptionsString(options: Record<string, any>): string {
  const definedOptions = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: '${value}'`);

  if (definedOptions.length === 0) {
    return '';
  }

  return `{ ${definedOptions.join(', ')} }`;
}
