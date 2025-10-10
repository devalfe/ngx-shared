/*
 * Public API Surface of ngx-global-state
 */

export * from './lib/global-state.service'; // incluye GLOBAL_STATE_PERSISTENCE type
export * from './lib/cross-app-bridge.service'; // incluye BRIDGE_CONFIG type
export * from './lib/message-bus.service'; // incluye MESSAGE_BUS_CONFIG type
export * from './lib/providers'; // incluye helpers nuevos y legacy (deprecated)
export * from './lib/tokens'; // exporta tokens legacy (deprecated)
