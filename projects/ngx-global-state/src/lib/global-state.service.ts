import { Inject, Injectable, PLATFORM_ID, InjectionToken, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, distinctUntilChanged, map, auditTime } from 'rxjs';
import { CrossAppBridgeService } from './cross-app-bridge.service';

/**
 * Representa el shape completo del estado compartido entre micro frontends.
 */
export interface GlobalState {
  user: {
    id: string;
    name: string;
    permissions: string[];
    preferences: Record<string, any>;
  } | null;

  notifications: {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: Date;
  }[];

  modalContext: {
    sourceApp: string;
    data: any;
    metadata: Record<string, any>;
  } | null;

  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    customCSS: string;
  };
}

/**
 * Servicio de estado global distribuido.
 *
 * - Expone un `BehaviorSubject` con el estado completo.
 * - Permite **persistir partes del estado** (user, theme) en sessionStorage.
 * - Integra con `CrossAppBridgeService` para sincronizar entre micro frontends.
 */
export interface GlobalStatePersistenceConfig {
  storage: Storage | null; // sessionStorage, localStorage o null (no persistir)
  key: string; // p. ej. 'myApp:globalState:v2'
  schemaVersion: number; // versión del shape persistido
}

export const GLOBAL_STATE_PERSISTENCE = new InjectionToken<GlobalStatePersistenceConfig>(
  'GLOBAL_STATE_PERSISTENCE',
);

export type GlobalAction =
  | { type: 'SET_USER'; payload: GlobalState['user'] }
  | { type: 'CLEAR_USER' }
  | {
      type: 'ADD_NOTIFICATION';
      payload: Omit<GlobalState['notifications'][0], 'id' | 'timestamp'> & { ttlMs?: number };
    }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
  | { type: 'SET_MODAL'; payload: GlobalState['modalContext'] }
  | { type: 'CLEAR_MODAL' }
  | { type: 'SET_THEME'; payload: GlobalState['theme'] }
  | { type: 'TOGGLE_THEME' }
  | { type: 'RESET_STATE' };

@Injectable({ providedIn: 'root' })
export class GlobalStateService {
  private readonly initialState: GlobalState = {
    user: null,
    notifications: [],
    modalContext: null,
    theme: { mode: 'light', primaryColor: '#007bff', customCSS: '' },
  };

  private stateSubject = new BehaviorSubject<GlobalState>(this.initialState);
  /** Observable público del estado completo (usar selectores para eficiencia). */
  public state$ = this.stateSubject.asObservable();

  private readonly origin = this.generateId();
  private readonly maxNotifications = 100;

  constructor(
    private bridge: CrossAppBridgeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional()
    @Inject(GLOBAL_STATE_PERSISTENCE)
    private readonly persistCfg: GlobalStatePersistenceConfig | null,
  ) {
    // Valores por defecto si no se provee configuración
    if (!this.persistCfg) {
      this.persistCfg = {
        storage: isPlatformBrowser(this.platformId) ? sessionStorage : null,
        key: 'ngx:globalState:v1',
        schemaVersion: 1,
      };
    }
    this.loadStateFromStorage();

    // Persistencia con throttling para rendimiento
    this.state$.pipe(auditTime(16)).subscribe((state) => this.saveStateToStorage(state));

    // Suscripción al puente con protección anti-eco
    this.bridge.listen<{ origin: string; action: GlobalAction }>('state').subscribe((msg) => {
      if (!msg || msg.origin === this.origin) return;
      this.reduce(msg.action, /*remote*/ true);
    });
  }

  /** Actualiza una clave del estado (merge superficial por compatibilidad). */
  updateState<K extends keyof GlobalState>(
    key: K,
    update: Partial<GlobalState[K]> | ((current: GlobalState[K]) => GlobalState[K]),
  ): void {
    const currentState = this.stateSubject.value;

    let newValue: GlobalState[K];
    if (typeof update === 'function') {
      newValue = (update as (c: GlobalState[K]) => GlobalState[K])(currentState[key]);
    } else if (update === null) {
      newValue = update as GlobalState[K];
    } else if (currentState[key] === (update as GlobalState[K])) {
      return;
    } else {
      newValue = { ...(currentState[key] as any), ...(update as any) } as GlobalState[K];
    }

    if (newValue === currentState[key]) return;

    const newState = { ...currentState, [key]: newValue } as GlobalState;
    this.stateSubject.next(newState);
    // Publica como acción tipada para otros MFEs
    let action: GlobalAction | null = null;
    if (key === 'user') action = { type: 'SET_USER', payload: newValue as GlobalState['user'] };
    if (key === 'modalContext')
      action = { type: 'SET_MODAL', payload: newValue as GlobalState['modalContext'] };
    if (key === 'theme') action = { type: 'SET_THEME', payload: newValue as GlobalState['theme'] };
    if (key === 'notifications') {
      // No publicamos un SET masivo de notificaciones; ya hay acciones específicas.
    }
    if (action) {
      this.bridge.publish('state', { origin: this.origin, action });
    }
  }

  /** Asigna el usuario actual. */
  setUser(user: GlobalState['user']): void {
    this.dispatch({ type: 'SET_USER', payload: user });
  }

  /** Limpia el usuario actual. */
  clearUser(): void {
    this.dispatch({ type: 'CLEAR_USER' });
  }

  /** Agrega una notificación nueva con TTL y límite. */
  addNotification(
    notification: Omit<GlobalState['notifications'][0], 'id' | 'timestamp'> & { ttlMs?: number },
  ): void {
    this.dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }

  /** Elimina una notificación por ID. */
  removeNotification(id: string): void {
    this.dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
  }

  /** Asigna un modal context. */
  setModalContext(context: GlobalState['modalContext']): void {
    this.dispatch({ type: 'SET_MODAL', payload: context });
  }

  /** Limpia el modal context. */
  clearModalContext(): void {
    this.dispatch({ type: 'CLEAR_MODAL' });
  }

  /** Asigna el tema. */
  setTheme(theme: GlobalState['theme']): void {
    this.dispatch({ type: 'SET_THEME', payload: theme });
  }

  /** Alterna el modo de tema. */
  toggleThemeMode(): void {
    this.dispatch({ type: 'TOGGLE_THEME' });
  }

  /** Resetea el estado por completo. */
  resetState(): void {
    this.dispatch({ type: 'RESET_STATE' });
  }

  /** Obtiene una instantánea no reactiva del estado. */
  getSnapshot(): GlobalState {
    return this.stateSubject.value;
  }

  // ---------- Selectores ----------
  selectUser(): Observable<GlobalState['user']> {
    return this.state$.pipe(
      map((s) => s.user),
      distinctUntilChanged(),
    );
  }

  selectNotifications(): Observable<GlobalState['notifications']> {
    return this.state$.pipe(
      map((s) => s.notifications),
      distinctUntilChanged(),
    );
  }

  selectNotificationCount(): Observable<number> {
    return this.selectNotifications().pipe(
      map((list) => list.length),
      distinctUntilChanged(),
    );
  }

  selectUserPermissions(): Observable<string[]> {
    return this.selectUser().pipe(
      map((u) => u?.permissions ?? []),
      distinctUntilChanged(),
    );
  }

  selectTheme(): Observable<GlobalState['theme']> {
    return this.state$.pipe(
      map((s) => s.theme),
      distinctUntilChanged(),
    );
  }

  private dispatch(action: GlobalAction): void {
    this.reduce(action, /*remote*/ false);
    // publicar para otros MFEs
    this.bridge.publish('state', { origin: this.origin, action });
  }

  private reduce(action: GlobalAction, remote: boolean): void {
    const s = this.stateSubject.value;
    switch (action.type) {
      case 'SET_USER':
        this.stateSubject.next({ ...s, user: action.payload });
        break;
      case 'CLEAR_USER':
        this.stateSubject.next({ ...s, user: null });
        break;
      case 'ADD_NOTIFICATION': {
        const now = new Date();
        const ttl = action.payload.ttlMs ?? 60_000;
        const cleaned = s.notifications.filter(
          (it) => now.getTime() - new Date(it.timestamp).getTime() < ttl,
        );
        const withMeta = { ...action.payload, id: this.generateId(), timestamp: now } as any;
        const next = [...cleaned, withMeta].slice(-this.maxNotifications);
        this.stateSubject.next({ ...s, notifications: next });
        break;
      }
      case 'REMOVE_NOTIFICATION':
        this.stateSubject.next({
          ...s,
          notifications: s.notifications.filter((n) => n.id !== action.payload.id),
        });
        break;
      case 'SET_MODAL':
        this.stateSubject.next({ ...s, modalContext: action.payload });
        break;
      case 'CLEAR_MODAL':
        this.stateSubject.next({ ...s, modalContext: null });
        break;
      case 'SET_THEME':
        this.stateSubject.next({ ...s, theme: { ...action.payload } });
        break;
      case 'TOGGLE_THEME':
        this.stateSubject.next({
          ...s,
          theme: { ...s.theme, mode: s.theme.mode === 'light' ? 'dark' : 'light' },
        });
        break;
      case 'RESET_STATE':
        this.stateSubject.next(this.initialState);
        break;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveStateToStorage(state: GlobalState): void {
    if (!isPlatformBrowser(this.platformId) || !this.persistCfg?.storage) return;
    try {
      const toSave = { v: this.persistCfg.schemaVersion, user: state.user, theme: state.theme };
      this.persistCfg.storage.setItem(this.persistCfg.key, JSON.stringify(toSave));
    } catch (err) {
      console.warn('No se pudo guardar estado en storage', err);
    }
  }

  private loadStateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId) || !this.persistCfg?.storage) return;
    try {
      const raw = this.persistCfg.storage.getItem(this.persistCfg.key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const migrated = this.migrateIfNeeded(parsed);
      this.stateSubject.next({ ...this.initialState, ...migrated });
    } catch (err) {
      console.warn('No se pudo cargar estado desde storage', err);
    }
  }

  private migrateIfNeeded(saved: any): Partial<GlobalState> {
    switch (saved?.v) {
      default:
        return {
          user: saved?.user ?? null,
          theme: saved?.theme ?? this.initialState.theme,
        } as Partial<GlobalState>;
    }
  }
}
