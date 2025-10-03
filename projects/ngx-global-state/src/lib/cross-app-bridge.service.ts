import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Puente de comunicación entre aplicaciones (cross-tab o cross-MFE).
 * - Implementa capa de publicación/escucha.
 * - Puede usar BroadcastChannel o storage events (dependiendo de config).
 * - Para pruebas locales puede configurarse en modo `none`.
 */
@Injectable({ providedIn: 'root' })
export class CrossAppBridgeService {
  private channels = new Map<string, Subject<any>>();

  constructor() {}

  /** Publica un mensaje en un canal. */
  publish(channel: string, payload: any) {
    let subj = this.channels.get(channel);
    if (!subj) {
      subj = new Subject<any>();
      this.channels.set(channel, subj);
    }
    subj.next(payload);
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
}
