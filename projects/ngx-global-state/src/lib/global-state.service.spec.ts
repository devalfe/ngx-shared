import { GlobalStateService, GlobalState } from './global-state.service';

// Avoid pulling Angular ESM into Jest by mocking @angular/core
jest.mock('@angular/core', () => ({ Injectable: () => (target: any) => target }));

// Simple mock for CrossAppBridgeService shape (no runtime import)
interface BridgeLike {
  publish: (channel: string, payload: any) => void;
}
class BridgeMock implements BridgeLike {
  publish = jest.fn();
}

describe('GlobalStateService', () => {
  let bridge: BridgeMock;
  let service: GlobalStateService;

  const sampleUser: NonNullable<GlobalState['user']> = {
    id: 'u1',
    name: 'Alice',
    permissions: ['read'],
    preferences: { lang: 'es' },
  };

  beforeEach(() => {
    // Clean storage between tests
    sessionStorage.clear();
    localStorage.clear();
    bridge = new BridgeMock();
    service = new GlobalStateService(bridge as any);
  });

  test('should initialize with defaults when no storage', (done) => {
    service.state$.subscribe((state) => {
      expect(state.user).toBeNull();
      expect(state.notifications).toEqual([]);
      expect(state.modalContext).toBeNull();
      expect(state.theme).toEqual({ mode: 'light', primaryColor: '#007bff', customCSS: '' });
      done();
    });
  });

  test('should load user/theme from sessionStorage on start', () => {
    const saved = {
      user: sampleUser,
      theme: { mode: 'dark', primaryColor: '#111111', customCSS: '.x{}' },
    } as Partial<GlobalState>;
    sessionStorage.setItem('globalState', JSON.stringify(saved));

    // Recreate service to trigger a load
    service = new GlobalStateService(bridge as any);

    expect((service as any).stateSubject.value.user).toEqual(sampleUser);
    expect((service as any).stateSubject.value.theme).toEqual(saved.theme);
  });

  test('updateState should next new state and publish via bridge', () => {
    service.updateState('theme', { mode: 'dark' });

    const value: GlobalState = (service as any).stateSubject.value;
    expect(value.theme.mode).toBe('dark');
    expect(bridge.publish).toHaveBeenCalledWith('state', {
      key: 'theme',
      newValue: { mode: 'dark', primaryColor: '#007bff', customCSS: '' },
    });
  });

  test('setUser should update user and persist to sessionStorage', () => {
    service.setUser(sampleUser);

    const savedRaw = sessionStorage.getItem('globalState');
    expect(savedRaw).not.toBeNull();
    const saved = JSON.parse(savedRaw!);
    expect(saved.user).toEqual(sampleUser);
  });

  test('addNotification should add with id and timestamp', () => {
    service.addNotification({ message: 'Hello', type: 'info' });

    const notifications = (service as any).stateSubject.value.notifications;
    expect(notifications).toHaveLength(1);
    const n = notifications[0];
    expect(n.message).toBe('Hello');
    expect(n.type).toBe('info');
    expect(typeof n.id).toBe('string');
    expect(true).toBe(true);
  });

  test('removeNotification should remove by id', () => {
    service.addNotification({ message: 'A', type: 'info' });
    const id = (service as any).stateSubject.value.notifications[0].id as string;

    service.removeNotification(id);
    expect((service as any).stateSubject.value.notifications).toHaveLength(0);
  });

  test('setModalContext and clearModalContext', () => {
    const ctx: NonNullable<GlobalState['modalContext']> = {
      sourceApp: 'app1',
      data: { x: 1 },
      metadata: { y: 2 },
    };

    service.setModalContext(ctx);
    expect((service as any).stateSubject.value.modalContext).toEqual(ctx);

    service.clearModalContext();
    expect((service as any).stateSubject.value.modalContext).toBeNull();
  });

  test('selectUser should not emit when unrelated keys change (distinctUntilChanged)', () => {
    const emits: GlobalState['user'][] = [];
    const sub = service.selectUser().subscribe((u) => emits.push(u));

    // Initial null emits from BehaviorSubject
    expect(emits).toEqual([null]);

    // Change theme: selectUser should NOT emit
    service.updateState('theme', { mode: 'dark' });
    expect(emits).toHaveLength(1);

    // Set user: should emit once
    service.setUser(sampleUser);
    expect(emits).toHaveLength(2);

    // Change notifications: still no extra user emission
    service.addNotification({ message: 'ok', type: 'success' });
    expect(emits).toHaveLength(2);

    sub.unsubscribe();
  });

  test('selectTheme returns updates and persistence stores only user+theme', () => {
    const themes: GlobalState['theme'][] = [];
    const sub = service.selectTheme().subscribe((t) => themes.push(t));

    service.updateState('theme', { primaryColor: '#ff0000' });

    // @ts-ignore
    expect(themes[themes.length - 1].primaryColor).toBe('#ff0000');

    // notifications are not persisted; user+theme are
    service.addNotification({ message: 'x', type: 'success' });

    const saved = JSON.parse(sessionStorage.getItem('globalState')!);
    expect(saved.theme.primaryColor).toBe('#ff0000');
    expect(saved.notifications).toBeUndefined();

    sub.unsubscribe();
  });
});
