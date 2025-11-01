import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { CrossAppBridgeService } from './cross-app-bridge.service';
import { GlobalStateService } from './global-state.service';
import {
  GLOBAL_STATE_OPTIONS,
  GlobalStateOptions,
  MESSAGE_BUS_OPTIONS,
  MessageBusOptions,
  MF_APP_ID,
} from './tokens';

/**
 * Proporciona los servicios principales para la gestión del estado global.
 *
 * @param options Opciones de configuración para el estado global.
 * @returns Un `EnvironmentProviders` para ser incluido en `bootstrapApplication`.
 */
export function provideGlobalState(options: GlobalStateOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: GLOBAL_STATE_OPTIONS, useValue: options },
    GlobalStateService,
    CrossAppBridgeService,
    // cualquier provider extra según options
  ]);
}

/**
 * Proporciona los servicios para el bus de mensajes entre aplicaciones.
 *
 * @param options Opciones de configuración para el bus de mensajes, como el `appId`.
 * @returns Un `EnvironmentProviders` para ser incluido en `bootstrapApplication`.
 */
export function provideMessageBus(options: MessageBusOptions = {}): EnvironmentProviders {
  const providers: Provider[] = [
    { provide: MESSAGE_BUS_OPTIONS, useValue: options },
    // Si se proporciona un appId, se registra como un proveedor para que pueda ser inyectado
    // en cualquier parte de la aplicación.
  ];
  if (options.appId) providers.push({ provide: MF_APP_ID, useValue: options.appId });
  return makeEnvironmentProviders(providers);
}
