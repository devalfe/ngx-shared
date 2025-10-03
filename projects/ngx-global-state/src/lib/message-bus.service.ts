import { Injectable } from '@angular/core';
import { Subject, Observable, filter, map } from 'rxjs';
import { CrossAppBridgeService } from './cross-app-bridge.service';

/** Mensaje genérico entre aplicaciones. */
export interface AppMessage {
  id: string;
  source: string;
  target: string | '*';
  type: string;
  payload: any;
  timestamp: Date;
  requiresResponse?: boolean;
  responseChannel?: string;
}

/**
 * Bus de mensajes inter-aplicaciones.
 * - Cada app se identifica por `appId`.
 * - Se pueden enviar mensajes directos o broadcast.
 * - Soporta peticiones con respuesta (`sendWithResponse`).
 */
@Injectable({ providedIn: 'root' })
export class MessageBusService {
  private messageSubject = new Subject<AppMessage>();

  constructor(private bridge: CrossAppBridgeService) {
    // @ts-ignore
    this.bridge.listen('bus').subscribe((msg: AppMessage) => this.messageSubject.next(msg));
  }

  /** Envía un mensaje a un target específico. */
  send<T = any>(target: string, type: string, payload: T, appId: string): void {
    const msg: AppMessage = {
      id: this.generateId(),
      source: appId,
      target,
      type,
      payload,
      timestamp: new Date(),
    };
    this.bridge.publish('bus', msg);
  }

  /** Envía un broadcast. */
  broadcast<T = any>(type: string, payload: T, appId: string): void {
    this.send('*', type, payload, appId);
  }

  /** Envía mensaje y espera respuesta única. */
  sendWithResponse<TReq, TRes>(
    target: string,
    type: string,
    payload: TReq,
    appId: string,
  ): Observable<TRes> {
    const responseChannel = this.generateId();
    return new Observable<TRes>((observer) => {
      const sub = this.onMessage<TRes>(responseChannel).subscribe((res) => {
        observer.next(res);
        observer.complete();
        sub.unsubscribe();
      });
      const msg: AppMessage = {
        id: this.generateId(),
        source: appId,
        target,
        type,
        payload,
        timestamp: new Date(),
        requiresResponse: true,
        responseChannel,
      };
      this.bridge.publish('bus', msg);
    });
  }

  /** Escucha mensajes por tipo. */
  onMessage<T = any>(type: string): Observable<T> {
    return this.messageSubject.pipe(
      filter((m) => m.type === type),
      map((m) => m.payload as T),
    );
  }

  /** Responde a un mensaje con responseChannel. */
  respond(original: AppMessage, response: any, appId: string) {
    if (original.requiresResponse && original.responseChannel) {
      this.send(original.source, original.responseChannel, response, appId);
    }
  }

  private generateId() {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
