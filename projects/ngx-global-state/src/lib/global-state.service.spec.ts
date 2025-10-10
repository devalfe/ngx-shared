import { Subject } from 'rxjs';
import { GlobalStateService, GlobalState, GlobalAction } from './global-state.service';

jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target,
  InjectionToken: class {
    constructor(public description: string) {}
  },
  Inject: () => () => undefined,
  Optional: () => () => undefined,
  PLATFORM_ID: 'browser',
}));

jest.mock('@angular/common', () => ({
  isPlatformBrowser: () => true,
}));

class BridgeMock {
  publish = jest.fn();
  private channels = new Map<string, Subject<any>>();

  listen<T>(channel: string) {
    let subject = this.channels.get(channel);
    if (!subject) {
      subject = new Subject<any>();
      this.channels.set(channel, subject);
    }
    return subject.asObservable();
  }

  emit<T>(channel: string, value: T): void {
    const subject = this.channels.get(channel);
    subject?.next(value);
  }
}

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('GlobalStateService', () => {
  const persistenceKey = 'spec:global-state';
  let bridge: BridgeMock;
  let storage: MemoryStorage;

  const sampleUser: NonNullable<GlobalState['user']> = {
    id: 'user-1',
    name: 'Ada',
    permissions: ['read'],
    preferences: { lang: 'es' },
  };

  beforeEach(() => {
    bridge = new BridgeMock();
    storage = new MemoryStorage();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createService(): GlobalStateService {
    return new GlobalStateService(bridge as any, 'browser', {
      storage,
      key: persistenceKey,
      schemaVersion: 1,
    });
  }

  test('initial snapshot uses defaults when nothing is persisted', () => {
    const service = createService();

    const snapshot = service.getSnapshot();
    expect(snapshot.user).toBeNull();
    expect(snapshot.notifications).toEqual([]);
    expect(snapshot.modalContext).toBeNull();
    expect(snapshot.theme).toEqual({ mode: 'light', primaryColor: '#007bff', customCSS: '' });
  });

  test('loads persisted user and theme on startup', () => {
    const saved = {
      v: 1,
      user: sampleUser,
      theme: { mode: 'dark', primaryColor: '#101010', customCSS: '.x{}' },
    };
    storage.setItem(persistenceKey, JSON.stringify(saved));

    const service = createService();

    const snapshot = service.getSnapshot();
    expect(snapshot.user).toEqual(sampleUser);
    expect(snapshot.theme).toEqual(saved.theme);
  });

  test('updateState merges partial payload and publishes typed action', () => {
    const service = createService();

    service.updateState('theme', { mode: 'dark' });

    const snapshot = service.getSnapshot();
    expect(snapshot.theme).toEqual({ mode: 'dark', primaryColor: '#007bff', customCSS: '' });

    expect(bridge.publish).toHaveBeenCalledWith(
      'state',
      expect.objectContaining({
        action: {
          type: 'SET_THEME',
          payload: { mode: 'dark', primaryColor: '#007bff', customCSS: '' },
        },
      }),
    );
  });

  test('setUser persists user and current theme after audit time', () => {
    jest.useFakeTimers();
    const service = createService();

    service.setUser(sampleUser);

    jest.advanceTimersByTime(20);
    jest.runOnlyPendingTimers();

    const raw = storage.getItem(persistenceKey);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toMatchObject({ v: 1, user: sampleUser, theme: service.getSnapshot().theme });
  });

  test('remote bridge actions mutate local state without re-publishing', () => {
    const service = createService();
    (bridge.publish as jest.Mock).mockClear();

    const remoteAction: { origin: string; action: GlobalAction } = {
      origin: 'other-app',
      action: { type: 'SET_USER', payload: sampleUser },
    };

    bridge.emit('state', remoteAction);

    expect(service.getSnapshot().user).toEqual(sampleUser);
    expect(bridge.publish).not.toHaveBeenCalled();
  });

  test('addNotification assigns id and timestamp metadata', () => {
    const service = createService();

    service.addNotification({ message: 'Hola', type: 'info' });

    const notifications = service.getSnapshot().notifications;
    expect(notifications).toHaveLength(1);
    const [notif] = notifications;
    expect(notif.message).toBe('Hola');
    expect(typeof notif.id).toBe('string');
    expect(notif.timestamp instanceof Date).toBe(true);
  });
});
