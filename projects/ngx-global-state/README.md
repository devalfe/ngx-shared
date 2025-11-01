# @devalfe/ngx-global-state — Documentación & Pruebas

Librería Angular para **estado global distribuido** y **bus de mensajes** entre micro frontends.

## 📦 Instalación

```bash
npm install @devalfe/ngx-global-state --save
```

## 🚀 Configuración Automática con Schematics (Recomendado)

Esta librería incluye schematics para automatizar su configuración en proyectos Angular.

### `ng add` (Instalación Rápida)

La forma más sencilla de empezar es usando `ng add`. Este comando instalará el paquete y configurará automáticamente los `providers` necesarios en tu aplicación con valores por defecto.

```bash
ng add @devalfe/ngx-global-state
```

Durante la instalación, te pedirá interactivamente el `appId` para tu aplicación.

### `ng generate` (Configuración Avanzada)

Si necesitas un control más detallado sobre la configuración, puedes usar el schematic `init` con `ng generate`.

```bash
ng generate @devalfe/ngx-global-state:init [opciones]
```

**Opciones Disponibles:**

- `--appId` (string): El ID único de la aplicación para el `MessageBusService`.
- `--persistence` (boolean): Habilita la persistencia del estado en `sessionStorage`. (Default: `true`)
- `--crossApp` (enum: `broadcast-channel` | `storage` | `none`): Define el modo de comunicación entre aplicaciones. (Default: `broadcast-channel`)
- `--channelPrefix` (string): Prefijo para los canales de comunicación. (Default: `ngx-gs`)

**Ejemplo de uso avanzado:**

```bash
ng generate @devalfe/ngx-global-state:init --appId="mi-app-principal" --crossApp="storage"
```

## ⚙️ Configuración Manual

Si prefieres no usar schematics, puedes configurar los providers manualmente en tu `app.config.ts` (o `main.ts`).

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideGlobalState, provideMessageBus } from '@devalfe/ngx-global-state';

bootstrapApplication(AppComponent, {
  providers: [
    provideGlobalState({ persistence: true, crossApp: 'broadcast-channel' }),
    provideMessageBus({ appId: 'shell' }),
  ],
});
```

## 📚 API (resumen)

- **GlobalStateService**
  - `setUser(user)` / `selectUser()`
  - `addNotification(n)` / `removeNotification(id)` / `selectNotifications()`
  - `setModalContext(ctx)` / `clearModalContext()`
  - `selectTheme()` / `updateState('theme', ...)`
- **MessageBusService**
  - `send(target, type, payload)`
  - `broadcast(type, payload)`
  - `sendWithResponse(target, type, payload)`
  - `onMessage(type)` / `respond(original, resp)`
- **Providers**
  - `provideGlobalState(options)`
  - `provideMessageBus(options)`

## 🧪 Tests (Jest)

- Config listo con `jest`, `ts-jest`, `jsdom` y mocks para `BroadcastChannel` y `storage`.
- Ejecuta:

```bash
npm run test
```

## 📘 Compodoc (docs)

Genera documentación estática a partir de tus comentarios TSDoc/JSDoc:

```bash
npm run docs
npm run docs:serve  # http://localhost:8080
```
