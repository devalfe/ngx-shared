import { Provider } from '@angular/core';
import {
  GLOBAL_STATE_OPTIONS,
  GlobalStateOptions,
  MESSAGE_BUS_OPTIONS,
  MessageBusOptions,
  MF_APP_ID,
} from './tokens';

export function provideGlobalState(options: GlobalStateOptions = {}): Provider[] {
  return [{ provide: GLOBAL_STATE_OPTIONS, useValue: options }];
}

export function provideMessageBus(options: MessageBusOptions = {}): Provider[] {
  const providers: Provider[] = [{ provide: MESSAGE_BUS_OPTIONS, useValue: options }];
  if (options.appId) providers.push({ provide: MF_APP_ID, useValue: options.appId });
  return providers;
}
