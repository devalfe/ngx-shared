# Guía de Uso — @devalfe/ngx-global-state

Esta guía complementa la documentación generada con Compodoc. Aquí encontrarás ejemplos prácticos.

---

## Novedad: nuevo esquema de providers (recomendado)

Desde la versión actual, la configuración se realiza con tokens dedicados y helpers nuevos:

- GLOBAL_STATE_PERSISTENCE para persistencia de estado
- BRIDGE_CONFIG para el transporte cross‑app
- MESSAGE_BUS_CONFIG para el bus de mensajes

Puedes usar los helpers:

- provideGlobalStatePersistence
- provideBridge
- provideMessageBus

### 🔹 Inicialización en el Shell (nuevo esquema)

En `main.ts` de tu aplicación shell:

```
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
      namespace: 'ngx-mf',
      protocolVersion: 1,
    }),
    ...provideMessageBus({ appId: 'shell', defaultTimeoutMs: 8000 }),
  ],
});
```

---

## 🔁 Compatibilidad: helpers legacy (deprecated)

Si estás migrando gradualmente, puedes seguir usando los helpers antiguos. Están marcados como deprecated y mapean internamente a los nuevos tokens. Se retirarán en la próxima versión mayor.

```
import { provideGlobalState, provideMessageBusLegacy } from '@devalfe/ngx-global-state';

bootstrapApplication(AppComponent, {
  providers: [
    // Mapea a GLOBAL_STATE_PERSISTENCE + BRIDGE_CONFIG
    ...provideGlobalState({
      appId: 'shell',            // ahora se usa en MESSAGE_BUS_CONFIG.appId
      persistence: 'session',    // mapea a storage sessionStorage
      crossApp: 'broadcast-channel', // mapea a BRIDGE_CONFIG.transport = 'broadcastChannel'
      channelPrefix: 'ngx-mf',   // mapea a BRIDGE_CONFIG.namespace
    }),

    // Mapea a MESSAGE_BUS_CONFIG
    ...provideMessageBusLegacy({ appId: 'shell' }),
  ],
});
```

Equivalencias:

- persistence → GlobalStatePersistenceConfig.storage (session/local/none)
- storageKey → GlobalStatePersistenceConfig.key
- crossApp → BridgeConfig.transport ('broadcastChannel' | 'storage' | 'none')
- channelPrefix → BridgeConfig.namespace
- appId → MessageBusConfig.appId

---

## 🔹 Consumo de estado en un MFE remoto

En cualquier componente:

```
constructor(private gs: GlobalStateService) {}

ngOnInit() {
  this.gs.selectTheme().subscribe(theme => {
    console.log('Theme activo:', theme.mode);
  });
}
```

---

## 🔹 Envío de mensajes entre MFEs

En un componente de **MFE-A**:

```ts
this.bus.send('mfe-b', 'user.updated', { id: '123', name: 'Ana' });
```

En un componente de **MFE-B**:

```ts
this.bus
  .onMessage<{ id: string; name: string }>('user.updated')
  .subscribe((u) => console.log('Usuario recibido:', u));
```

---

## 🔹 Notificaciones Globales

```ts
this.gs.addNotification({ message: 'Guardado con éxito', type: 'success' });
```

En otro MFE:

```ts
this.gs.selectNotifications().subscribe((n) => console.log('Notificaciones:', n));
```

---

## 🔹 Modales Compartidos

```ts
// Abrir modal desde MFE-A
this.gs.setModalContext({ sourceApp: 'mfe-a', data: { formId: 42 }, metadata: {} });

// Escuchar en MFE-B
this.gs.selectUser().subscribe((user) => {
  /* ... */
});
```

---

## 🔹 Cambio de Tema desde Shell

```
toggleTheme() {
  this.gs.updateState('theme', t => ({
    ...t,
    mode: t.mode === 'light' ? 'dark' : 'light'
  }));
}
```

Todos los MFEs conectados reciben el cambio automáticamente 🚀
