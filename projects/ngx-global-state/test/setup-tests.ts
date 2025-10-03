// jsdom no trae BroadcastChannel ni storage events por defecto
class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  private peers: Set<MockBroadcastChannel>;
  private static bus = new Map<string, Set<MockBroadcastChannel>>();

  constructor(name: string) {
    this.name = name;
    const set = MockBroadcastChannel.bus.get(name) ?? new Set();
    set.add(this);
    MockBroadcastChannel.bus.set(name, set);
    this.peers = set;
  }
  postMessage(data: any) {
    // @ts-ignore
    for (const ch of this.peers) {
      if (ch !== this && ch.onmessage) {
        ch.onmessage({ data } as any);
      }
    }
  }
  close() {
    const set = MockBroadcastChannel.bus.get(this.name);
    set?.delete(this);
  }
}
(global as any).BroadcastChannel = MockBroadcastChannel;

// Storage mocks mínimos
class MemStorage {
  private s = new Map<string, string>();
  getItem(k: string) {
    return this.s.has(k) ? this.s.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.s.set(k, v);
  }
  removeItem(k: string) {
    this.s.delete(k);
  }
  clear() {
    this.s.clear();
  }
  key(i: number) {
    return Array.from(this.s.keys())[i] ?? null;
  }
  get length() {
    return this.s.size;
  }
}
(global as any).localStorage = new MemStorage();
(global as any).sessionStorage = new MemStorage();

// window.dispatchEvent(storage) simulación (si lo necesitas)
Object.defineProperty(window, 'dispatchStorageEvent', {
  value: (key: string, newValue: string | null) => {
    const ev = new (window as any).StorageEvent('storage', {
      key,
      newValue,
      storageArea: localStorage,
    });
    window.dispatchEvent(ev);
  },
});
