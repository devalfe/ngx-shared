import { Provider } from '@angular/core';
import { BRIDGE_CONFIG, BridgeConfig } from './cross-app-bridge.service';
import { MESSAGE_BUS_CONFIG, MessageBusConfig } from './message-bus.service';
import { GLOBAL_STATE_PERSISTENCE, GlobalStatePersistenceConfig } from './global-state.service';
import { GlobalStateOptions, MessageBusOptions } from './tokens';

/**
 * Registra la configuracion compartida para el CrossAppBridgeService.
 * Declara transporte, namespace y versionado al nivel raiz de la aplicacion.
 */
export function provideBridge(config: BridgeConfig): Provider[] {
  return [{ provide: BRIDGE_CONFIG, useValue: config }];
}

/**
 * Expone la configuracion del MessageBusService via inyeccion de dependencias.
 * Permite centralizar appId, timeouts y reglas de filtros entre micro frontends.
 */
export function provideMessageBus(config: MessageBusConfig): Provider[] {
  return [{ provide: MESSAGE_BUS_CONFIG, useValue: config }];
}

/**
 * Define las reglas de persistencia que usa GlobalStateService.
 * Inyecta storage, clave y version del schema antes de inicializar el estado global.
 */
export function provideGlobalStatePersistence(config: GlobalStatePersistenceConfig): Provider[] {
  return [{ provide: GLOBAL_STATE_PERSISTENCE, useValue: config }];
}

/**
 * @deprecated Usa provideBridge + provideGlobalStatePersistence. Este helper legacy mapea opciones antiguas
 * a los nuevos tokens. Sera removido en proxima version mayor.
 */
export function provideGlobalState(options: GlobalStateOptions = {}): Provider[] {
  const storage: Storage | null =
    options.persistence === 'session'
      ? typeof window !== 'undefined'
        ? sessionStorage
        : null
      : options.persistence === 'local'
        ? typeof window !== 'undefined'
          ? localStorage
          : null
        : null;

  const persistence: GlobalStatePersistenceConfig = {
    storage,
    key: options.storageKey ?? 'ngx:globalState:v1',
    schemaVersion: 1,
  };

  const transport: BridgeConfig['transport'] =
    options.crossApp === 'broadcast-channel'
      ? 'broadcastChannel'
      : options.crossApp === 'storage-event'
        ? 'storage'
        : 'none';

  const bridge: BridgeConfig = {
    transport,
    namespace: options.channelPrefix ?? 'ngxShared',
    protocolVersion: 1,
    channelPrefix: options.channelPrefix,
  };

  return [
    { provide: GLOBAL_STATE_PERSISTENCE, useValue: persistence },
    { provide: BRIDGE_CONFIG, useValue: bridge },
  ];
}

/**
 * @deprecated Usa provideMessageBus con MessageBusConfig. Este helper legacy mapea opciones antiguas a la nueva config.
 * Sera removido en proxima version mayor.
 */
export function provideMessageBusLegacy(options: MessageBusOptions = {}): Provider[] {
  const cfg: MessageBusConfig = {
    appId: options.appId ?? 'unknown',
    defaultTimeoutMs: 10000,
    allowSelfLoop: false,
  };
  return [{ provide: MESSAGE_BUS_CONFIG, useValue: cfg }];
}
