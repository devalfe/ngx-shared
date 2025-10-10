import { InjectionToken } from '@angular/core';

/**
 * @deprecated Reemplazado por GlobalStatePersistenceConfig (GLOBAL_STATE_PERSISTENCE) y BridgeConfig (BRIDGE_CONFIG).
 * - persistence → GlobalStatePersistenceConfig.storage (session/local/none)
 * - storageKey → GlobalStatePersistenceConfig.key
 * - crossApp → BridgeConfig.transport ('broadcastChannel' | 'storage' | 'none')
 * - channelPrefix → BridgeConfig.namespace/channelPrefix
 * - appId → ahora se configura en MESSAGE_BUS_CONFIG.appId
 */
export type PersistenceMode = 'session' | 'local' | 'none';
/** @deprecated Usa BridgeConfig.transport ('broadcastChannel' | 'storage' | 'none'). */
export type CrossAppMode = 'broadcast-channel' | 'storage-event' | 'none';

/** @deprecated Usa provideBridge + provideGlobalStatePersistence. */
export interface GlobalStateOptions {
  storageKey?: string;
  persistence?: PersistenceMode;
  crossApp?: CrossAppMode;
  channelPrefix?: string;
  debug?: boolean;
  appId?: string;
}

/** @deprecated Usa MessageBusConfig y MESSAGE_BUS_CONFIG. */
export interface MessageBusOptions {
  channelName?: string;
  debug?: boolean;
  appId?: string;
}

/** @deprecated No utilizado por los servicios actuales. Usa GLOBAL_STATE_PERSISTENCE/BRIDGE_CONFIG. */
export const GLOBAL_STATE_OPTIONS = new InjectionToken<GlobalStateOptions>('GLOBAL_STATE_OPTIONS');
/** @deprecated No utilizado por los servicios actuales. Usa MESSAGE_BUS_CONFIG. */
export const MESSAGE_BUS_OPTIONS = new InjectionToken<MessageBusOptions>('MESSAGE_BUS_OPTIONS');
/** @deprecated No utilizado. Usa MESSAGE_BUS_CONFIG.appId. */
export const MF_APP_ID = new InjectionToken<string>('MF_APP_ID');
