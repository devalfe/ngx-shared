import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Puente de comunicación entre aplicaciones con transporte pluggable.
 * - Transportes: BroadcastChannel | storage events | none (solo local)
 * - Namespacing y versión de protocolo
 * - Anti-eco por instancia
 */
export interface BridgeConfig {
  transport: 'broadcastChannel' | 'storage' | 'none';
  namespace: string; // p. ej., 'ngxShared'
  protocolVersion: number; // p. ej., 1
  channelPrefix?: string; // opcional: prefijo personalizado
}

export const BRIDGE_CONFIG = new InjectionToken<BridgeConfig>('BRIDGE_CONFIG');

interface Envelope<T = any> {
  v: number; // versión de protocolo
  ch: string; // canal lógico
  origin: string; // id de instancia
  payload: T; // mensaje
  ts: number; // timestamp ms
}

@Injectable({ providedIn: 'root' })
export class CrossAppBridgeService {
  private channels = new Map<string, Subject<any>>();
  private readonly instanceId = this.randomId('br_');
  private readonly prefix: string;
  private bc?: BroadcastChannel;
  private storageListener?: (ev: StorageEvent) => void;

  constructor(@Optional() @Inject(BRIDGE_CONFIG) private readonly cfg?: BridgeConfig) {
    // valores por defecto para compatibilidad
    this.cfg ||= { transport: 'none', namespace: 'ngx', protocolVersion: 1 };
    this.prefix = this.cfg.channelPrefix ?? `${this.cfg.namespace}:v${this.cfg.protocolVersion}`;
    this.setupTransport();
  }

  /** Publica un mensaje en un canal */
  publish<T>(channel: string, payload: T): void {
    const env: Envelope<T> = {
      v: this.cfg!.protocolVersion,
      ch: channel,
      origin: this.instanceId,
      payload,
      ts: Date.now(),
    };

    // Entrega local inmediata
    this.deliverLocal(channel, payload);

    try {
      switch (this.cfg!.transport) {
        case 'broadcastChannel':
          this.bc?.postMessage(env);
          break;
        case 'storage': {
          const key = `${this.prefix}:${channel}`;
          localStorage.setItem(key, JSON.stringify(env));
          localStorage.removeItem(key);
          break;
        }
        case 'none':
        default:
          // no-op
          break;
      }
    } catch {
      // silenciar errores de transporte para robustez
    }
  }

  /** Se suscribe a un canal específico. */
  listen<T>(channel: string): Observable<T> {
    let subj = this.channels.get(channel);
    if (!subj) {
      subj = new Subject<any>();
      this.channels.set(channel, subj);
    }
    return subj.asObservable();
  }

  /** Limpia recursos (útil en pruebas) */
  destroy(): void {
    try {
      this.bc?.close();
    } catch {}
    this.bc = undefined;
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener as any);
      this.storageListener = undefined;
    }
  }

  // ----- Internos -----
  private setupTransport(): void {
    if (this.cfg!.transport === 'broadcastChannel' && 'BroadcastChannel' in window) {
      try {
        this.bc = new BroadcastChannel(this.prefix);
        this.bc.onmessage = (ev) => this.onEnvelope(ev.data as Envelope);
        return;
      } catch {}
    }

    if (this.cfg!.transport === 'storage') {
      this.storageListener = (ev: StorageEvent) => {
        if (!ev.key || !ev.newValue) return;
        if (!ev.key.startsWith(this.prefix + ':')) return;
        try {
          const env = JSON.parse(ev.newValue) as Envelope;
          this.onEnvelope(env);
        } catch {}
      };
      window.addEventListener('storage', this.storageListener);
      return;
    }
    // transport none => solo entrega local
  }

  private onEnvelope(env: Envelope): void {
    if (!env || env.origin === this.instanceId) return; // anti-eco
    if (env.v !== this.cfg!.protocolVersion) return; // versión incompatible
    this.deliverLocal(env.ch, env.payload);
  }

  private deliverLocal(channel: string, payload: any): void {
    let subj = this.channels.get(channel);
    if (!subj) {
      subj = new Subject<any>();
      this.channels.set(channel, subj);
    }
    subj.next(payload);
  }

  private randomId(pfx = ''): string {
    return pfx + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
