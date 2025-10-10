# @devalfe/ngx-global-state — Documentación & Pruebas

Librería Angular para **estado global distribuido** y **bus de mensajes** entre micro frontends.

## 📦 Instalación

```bash
npm install @devalfe/ngx-global-state --save
```

## 🚀 Uso rápido

Inicializa con el nuevo esquema de providers (recomendado):

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import {
  provideGlobalStatePersistence,
  provideBridge,
  provideMessageBus,
} from '@devalfe/ngx-global-state';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideGlobalStatePersistence({
      storage: typeof window !== 'undefined' ? sessionStorage : null,
      key: 'ngx:globalState:v1',
      schemaVersion: 1,
    }),
    ...provideBridge({
      transport: 'broadcastChannel', // 'broadcastChannel' | 'storage' | 'none'
      namespace: 'ngxShared',
      protocolVersion: 1,
    }),
    ...provideMessageBus({ appId: 'shell', defaultTimeoutMs: 8000 }),
  ],
});
```

Compatibilidad: aún puedes usar los helpers legacy (deprecated) durante la migración:

```ts
import { provideGlobalState, provideMessageBusLegacy } from '@devalfe/ngx-global-state';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideGlobalState({
      appId: 'shell',
      persistence: 'session',
      crossApp: 'broadcast-channel',
      channelPrefix: 'ngxShared',
    }),
    ...provideMessageBusLegacy({ appId: 'shell' }),
  ],
});
```

## 📚 API (resumen)

- GlobalStateService
  - setUser(user) / clearUser() / getSnapshot()
  - addNotification(n) / removeNotification(id) / selectNotifications() / selectNotificationCount()
  - setModalContext(ctx) / clearModalContext()
  - selectUser() / selectUserPermissions()
  - selectTheme() / setTheme(theme) / toggleThemeMode() / updateState('theme', ...)
  - resetState()
- MessageBusService
  - send(target, type, payload)
  - broadcast(type, payload)
  - sendWithResponse(target, type, payload, timeoutMs?)
  - on(type) / onMessage(type) / respond(original, resp)
- Providers (nuevo esquema)
  - provideGlobalStatePersistence(config)
  - provideBridge(config)
  - provideMessageBus(config)
- Compatibilidad (deprecated)
  - provideGlobalState(options)
  - provideMessageBusLegacy(options)

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
