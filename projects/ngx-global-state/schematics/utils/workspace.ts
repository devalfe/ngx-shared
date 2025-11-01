import { workspaces } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';

export async function getWorkspace(tree: Tree) {
  const host: workspaces.WorkspaceHost = {
    async readFile(path: string): Promise<string> {
      const data = tree.read(path);
      if (!data) throw new Error('File not found: ' + path);
      return data.toString();
    },
    async writeFile(path: string, data: string): Promise<void> {
      tree.overwrite(path, data);
    },
    async isDirectory(path: string): Promise<boolean> {
      return tree.getDir(path).subfiles.length > 0 || tree.getDir(path).subdirs.length > 0;
    },
    async isFile(path: string): Promise<boolean> {
      return !!tree.read(path);
    },
  };
  const { workspace } = await workspaces.readWorkspace('/', host);
  return { workspace, host };
}

export function getDefaultProjectName(ws: workspaces.WorkspaceDefinition) {
  return ws.extensions['defaultProject'] as string | undefined;
}
