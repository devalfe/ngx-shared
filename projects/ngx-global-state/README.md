# @devalfe/ngx-global-state — Documentación & Pruebas

Librería Angular para **estado global distribuido** y **bus de mensajes** entre micro frontends.

## 📦 Instalación

```bash
npm install @devalfe/ngx-global-state --save
```

## 🚀 Uso rápido

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideGlobalState, provideMessageBus } from '@devalfe/mf-shared';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideGlobalState({ appId: 'shell', persistence: 'session', crossApp: 'none' }),
    ...provideMessageBus({ appId: 'shell' }),
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
