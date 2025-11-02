export function insertImport(sourceText: string, symbol: string, from: string): string {
  const has = new RegExp(
    `import\\s+\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s+from\\s+['"]${from}['"]`,
  ).test(sourceText);
  if (has) return sourceText;
  return `import { ${symbol} } from '${from}';\n` + sourceText;
}

export function ensureProviderInAppConfig(sourceText: string, providerExpr: string): string {
  // Busca providers en provideAppConfig o en export const appConfig: ApplicationConfig = { providers: [...] }
  const providersRegex = /providers\s*:\s*\[([\s\S]*?)\]/m;
  const m = providersRegex.exec(sourceText);
  if (m) {
    const inside = m[1];
    if (inside.includes(providerExpr)) return sourceText;
    const updated = sourceText.replace(providersRegex, (full) =>
      full.replace(inside, `${inside.trim() ? inside.trim() + ', ' : ''}${providerExpr}`),
    );
    return updated;
  }
  // Fallback: inyectar un bloque providers si no existe
  const configRegex = /export\s+const\s+appConfig\s*:\s*ApplicationConfig\s*=\s*\{([\s\S]*?)\};/m;
  if (configRegex.test(sourceText)) {
    return sourceText.replace(configRegex, (full, body) => {
      const hasProviders = /providers\s*:/.test(body);
      if (hasProviders) return full; // ya existe, el primer regex debió atraparlo
      const newBody = body.replace(/\}$/, `  providers: [${providerExpr}],\n}`);
      return full.replace(body, newBody);
    });
  }
  return sourceText;
}

export function insertBeforeBootstrap(sourceText: string, codeLine: string): string {
  // Inserta antes de "bootstrapApplication(" en main.ts
  const idx = sourceText.indexOf('bootstrapApplication(');
  if (idx === -1) return sourceText;
  const head = sourceText.slice(0, idx);
  const tail = sourceText.slice(idx);
  if (head.includes(codeLine.trim())) return sourceText;
  return `${head}${codeLine}\n${tail}`;
}
