import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { Subject, Observable, filter, map, take, race, timer, tap } from 'rxjs';
import { CrossAppBridgeService } from './cross-app-bridge.service';

/** Mensaje genérico entre aplicaciones. */
export interface AppMessage<T = any> {
  id: string;
  source: string; // appId emisor
  target: string | '*';
  type: string;
  payload: T;
  timestamp: string; // ISO para serialización segura
  requiresResponse?: boolean;
  responseChannel?: string;
}

export interface MessageBusConfig {
  appId: string; // id de esta app/instancia
  defaultTimeoutMs?: number; // para request/response
  allowSelfLoop?: boolean; // si true, procesa mensajes enviados por esta app
  allowedTargets?: string[]; // whitelist opcional
  allowedTypes?: string[]; // whitelist opcional
}

export const MESSAGE_BUS_CONFIG = new InjectionToken<MessageBusConfig>('MESSAGE_BUS_CONFIG');

/**
 * Bus de mensajes inter-aplicaciones.
 * - Cada app se identifica por `appId`.
 * - Se pueden enviar mensajes directos o broadcast.
 * - Soporta peticiones con respuesta (`sendWithResponse`).
 */
@Injectable({ providedIn: 'root' })
export class MessageBusService {
  private messageSubject = new Subject<AppMessage>();

  constructor(
    private bridge: CrossAppBridgeService,
    @Optional() @Inject(MESSAGE_BUS_CONFIG) private readonly cfg?: MessageBusConfig,
  ) {
    this.cfg ||= { appId: 'unknown', defaultTimeoutMs: 10000, allowSelfLoop: false };

    // Enrutar mensajes desde el bridge
    this.bridge.listen<AppMessage>('bus').subscribe((msg) => {
      if (!this.isAcceptable(msg)) return;
      this.messageSubject.next(msg);
    });
  }

  /** Envía un mensaje a un target específico (usa appId de configuración). */
  send<T = any>(target: string, type: string, payload: T): void;
  /** Versión compatible: acepta appId explícito (deprecado). */
  send<T = any>(target: string, type: string, payload: T, appId: string): void;
  send<T = any>(target: string, type: string, payload: T, appId?: string): void {
    const sourceId = appId ?? this.cfg!.appId;
    const msg: AppMessage<T> = {
      id: this.generateId(),
      source: sourceId,
      target,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.bridge.publish('bus', msg);
  }

  /** Envía un broadcast. */
  broadcast<T = any>(type: string, payload: T): void;
  /** Versión compatible con appId explícito (deprecado). */
  broadcast<T = any>(type: string, payload: T, appId: string): void;
  broadcast<T = any>(type: string, payload: T, appId?: string): void {
    this.send('*', type, payload, appId as any);
  }

  /** Envía mensaje y espera respuesta única. */
  sendWithResponse<TReq, TRes>(
    target: string,
    type: string,
    payload: TReq,
    timeoutMs?: number,
  ): Observable<TRes>;
  /** Versión compatible: incluye appId explícito (deprecado). */
  sendWithResponse<TReq, TRes>(
    target: string,
    type: string,
    payload: TReq,
    appId: string,
    timeoutMs?: number,
  ): Observable<TRes>;
  sendWithResponse<TReq, TRes>(
    target: string,
    type: string,
    payload: TReq,
    a?: any,
    b?: any,
  ): Observable<TRes> {
    const hasLegacyAppId = typeof a === 'string';
    const appId: string | undefined = hasLegacyAppId ? (a as string) : undefined;
    const timeoutMs: number | undefined = hasLegacyAppId
      ? (b as number | undefined)
      : (a as number | undefined);

    const responseChannel = this.generateId('res_');
    const response$ = this.on<TRes>(responseChannel).pipe(
      take(1),
      map((m) => m.payload as TRes),
    );
    const to = timeoutMs ?? this.cfg!.defaultTimeoutMs ?? 10000;
    const guarded$ = race(
      response$,
      timer(to).pipe(
        take(1),
        tap(() => {}),
        map(() => {
          throw new Error(`Timeout esperando respuesta a ${type} desde ${target}`);
        }),
      ),
    );

    // Enviar después de suscribir para no perder respuestas rápidas
    setTimeout(() => {
      const sourceId = appId ?? this.cfg!.appId;
      const msg: AppMessage<TReq> = {
        id: this.generateId(),
        source: sourceId,
        target,
        type,
        payload,
        timestamp: new Date().toISOString(),
        requiresResponse: true,
        responseChannel,
      };
      this.bridge.publish('bus', msg);
    }, 0);

    return guarded$;
  }

  /** Escucha mensajes por tipo y devuelve AppMessage completo. */
  on<T = any>(type: string, from?: string | '*'): Observable<AppMessage<T>> {
    return this.messageSubject.pipe(
      filter((m) => m.type === type),
      filter((m) => (from ? from === '*' || m.source === from : true)),
    );
  }

  /** Versión simplificada que expone solo el payload. */
  onMessage<T = any>(type: string): Observable<T> {
    return this.on<T>(type).pipe(map((m) => m.payload as T));
  }

  /** Responde a un mensaje con responseChannel. */
  respond<T = any>(original: AppMessage, response: T): void;
  /** Versión compatible que acepta appId explícito (deprecado). */
  respond<T = any>(original: AppMessage, response: T, appId: string): void;
  respond<T = any>(original: AppMessage, response: T, appId?: string) {
    const sourceId = appId ?? this.cfg!.appId;
    if (original.requiresResponse && original.responseChannel) {
      this.send(original.source, original.responseChannel, response, sourceId);
    }
  }

  // -------- Internos --------
  private isAcceptable(msg: AppMessage | null | undefined): msg is AppMessage {
    if (!msg) return false;
    if (!this.cfg!.allowSelfLoop && msg.source === this.cfg!.appId) return false; // anti-bucle
    if (!(msg.target === '*' || msg.target === this.cfg!.appId)) return false; // routing por target
    if (this.cfg!.allowedTypes && !this.cfg!.allowedTypes.includes(msg.type)) return false;
    if (this.cfg!.allowedTargets && !['*', this.cfg!.appId].some((t) => t === msg.target))
      return false;
    return true;
  }

  private generateId(prefix: string = 'msg_') {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }
}
