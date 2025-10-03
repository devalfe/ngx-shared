import { InjectionToken } from '@angular/core';

export type PersistenceMode = 'session' | 'local' | 'none';
export type CrossAppMode = 'broadcast-channel' | 'storage-event' | 'none';

export interface GlobalStateOptions {
  storageKey?: string;
  persistence?: PersistenceMode;
  crossApp?: CrossAppMode;
  channelPrefix?: string;
  debug?: boolean;
  appId?: string;
}

export interface MessageBusOptions {
  channelName?: string;
  debug?: boolean;
  appId?: string;
}

export const GLOBAL_STATE_OPTIONS = new InjectionToken<GlobalStateOptions>('GLOBAL_STATE_OPTIONS');
export const MESSAGE_BUS_OPTIONS = new InjectionToken<MessageBusOptions>('MESSAGE_BUS_OPTIONS');
export const MF_APP_ID = new InjectionToken<string>('MF_APP_ID');
