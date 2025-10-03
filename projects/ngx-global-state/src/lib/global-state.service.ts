import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
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

  constructor(private bridge: CrossAppBridgeService) {
    this.loadStateFromStorage();
    this.state$.subscribe((state) => this.saveStateToStorage(state));
  }

  /** Actualiza una clave del estado. */
  updateState<K extends keyof GlobalState>(
    key: K,
    update: Partial<GlobalState[K]> | ((current: GlobalState[K]) => GlobalState[K]),
  ): void {
    const currentState = this.stateSubject.value;

    let newValue: GlobalState[K];
    if (typeof update === 'function') {
      newValue = (update as (c: GlobalState[K]) => GlobalState[K])(currentState[key]);
    } else if (update === null) {
      // Allow explicit null assignment (e.g., clear modalContext)
      newValue = update as GlobalState[K];
    } else if (currentState[key] === (update as GlobalState[K])) {
      // No-op: same reference, avoid needless emissions and publish
      return;
    } else {
      // Shallow merge for partial updates
      newValue = { ...(currentState[key] as any), ...(update as any) } as GlobalState[K];
    }

    // If nothing really changed, skip
    if (newValue === currentState[key]) return;

    const newState = { ...currentState, [key]: newValue } as GlobalState;
    this.stateSubject.next(newState);
    this.bridge.publish('state', { key, newValue });
  }

  /** Asigna el usuario actual. */
  setUser(user: GlobalState['user']): void {
    this.updateState('user', user);
  }

  /** Agrega una notificación nueva. */
  addNotification(notification: Omit<GlobalState['notifications'][0], 'id' | 'timestamp'>): void {
    this.updateState('notifications', (current) => [
      ...current,
      { ...notification, id: this.generateId(), timestamp: new Date() },
    ]);
  }

  /** Elimina una notificación por ID. */
  removeNotification(id: string): void {
    this.updateState('notifications', (current) => current.filter((n) => n.id !== id));
  }

  /** Asigna un modal context. */
  setModalContext(context: GlobalState['modalContext']): void {
    this.updateState('modalContext', context);
  }

  /** Limpia el modal context. */
  clearModalContext(): void {
    this.updateState('modalContext', null);
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

  selectTheme(): Observable<GlobalState['theme']> {
    return this.state$.pipe(
      map((s) => s.theme),
      distinctUntilChanged(),
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveStateToStorage(state: GlobalState): void {
    try {
      const stateToSave = { user: state.user, theme: state.theme };
      sessionStorage.setItem('globalState', JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('No se pudo guardar estado en storage', err);
    }
  }

  private loadStateFromStorage(): void {
    try {
      const saved = sessionStorage.getItem('globalState');
      if (saved) {
        this.stateSubject.next({ ...this.initialState, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.warn('No se pudo cargar estado desde storage', err);
    }
  }
}
