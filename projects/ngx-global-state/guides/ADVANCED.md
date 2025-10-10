# Guía Avanzada — @devalfe/ngx-global-state

## 🔧 Configuración con Module Federation

En el `federation.config.ts` de tu Shell:

```ts
remotes: {
  mfeFace: 'https://mfe-face.dev/remoteEntry.json'
},
shared: {
  '@angular/core': { singleton: true, strictVersion: true },
  '@angular/common': { singleton: true, strictVersion: true },
  '@angular/router': { singleton: true, strictVersion: true },
  '@devalfe/ngx-global-state': { singleton: true, eager: true }
}
```

En el Remoto:

```ts
exposes: {
  './Module': './apps/mfe-face/src/app/remote-entry/remote-entry.module.ts',
}
```

---

## 🔄 Comunicación Cross-Origin (iframe + postMessage)

Ejemplo de puente cuando los MFEs están en **dominios distintos** y no pueden usar MF nativo.

**Shell (padre):**

```ts
iframeEl.contentWindow?.postMessage(
  { type: 'theme.changed', payload: { mode: 'dark' } },
  'https://mfe-face.dev',
);
```

**MFE (hijo):**

```ts
window.addEventListener('message', (ev) => {
  if (ev.data?.type === 'theme.changed') {
    this.gs.updateState('theme', ev.data.payload);
  }
});
```

---

## 📡 Integración con WebSocket

Ambos MFEs se conectan a un hub:

```ts
ws.send(JSON.stringify({ type: 'theme.changed', payload: { mode: 'dark' } }));
```

Y escuchan:

```ts
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === 'theme.changed') this.gs.updateState('theme', msg.payload);
};
```

---

## 🧪 Testing con Jest

```ts
it('debe propagar el theme a través de CrossAppBridgeService', (done) => {
  const a = new CrossAppBridgeService();
  const b = new CrossAppBridgeService();
  b.listen('state').subscribe((s) => {
    expect(s.x).toBe(1);
    done();
  });
  a.publish('state', { x: 1 });
});
```
