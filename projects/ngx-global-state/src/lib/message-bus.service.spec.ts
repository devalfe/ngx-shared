import { firstValueFrom } from 'rxjs';
import { CrossAppBridgeService } from './cross-app-bridge.service';
import { AppMessage, MessageBusService } from './message-bus.service';

jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target,
  InjectionToken: class {
    constructor(public description: string) {}
  },
  Inject: () => () => undefined,
  Optional: () => () => undefined,
}));

describe('MessageBusService', () => {
  let bridge: CrossAppBridgeService;
  let busA: MessageBusService;
  let busB: MessageBusService;
  let busC: MessageBusService;

  beforeEach(() => {
    bridge = new CrossAppBridgeService({
      transport: 'none',
      namespace: 'spec',
      protocolVersion: 1,
    });
    busA = new MessageBusService(bridge, {
      appId: 'appA',
      allowSelfLoop: false,
      defaultTimeoutMs: 50,
    });
    busB = new MessageBusService(bridge, {
      appId: 'appB',
      allowSelfLoop: false,
      defaultTimeoutMs: 50,
    });
    busC = new MessageBusService(bridge, {
      appId: 'appC',
      allowSelfLoop: false,
      defaultTimeoutMs: 50,
      allowedTypes: ['PING', 'BROADCAST'],
    });
  });

  test('send routes payload only to the configured target', () => {
    const receivedA: string[] = [];
    const receivedB: string[] = [];
    const receivedC: string[] = [];

    const subA = busA.onMessage<string>('PING').subscribe((value) => receivedA.push(value));
    const subB = busB.onMessage<string>('PING').subscribe((value) => receivedB.push(value));
    const subC = busC.onMessage<string>('PING').subscribe((value) => receivedC.push(value));

    busA.send('appB', 'PING', 'hello');

    expect(receivedB).toEqual(['hello']);
    expect(receivedA).toEqual([]);
    expect(receivedC).toEqual([]);

    subA.unsubscribe();
    subB.unsubscribe();
    subC.unsubscribe();
  });

  test('broadcast delivers to all peers except the sender when self-loop disabled', () => {
    const payloadB: string[] = [];
    const payloadC: string[] = [];
    const payloadA: string[] = [];

    const subB = busB.onMessage<string>('BROADCAST').subscribe((val) => payloadB.push(val));
    const subC = busC.onMessage<string>('BROADCAST').subscribe((val) => payloadC.push(val));
    const subA = busA.onMessage<string>('BROADCAST').subscribe((val) => payloadA.push(val));

    busA.broadcast('BROADCAST', 'news');

    expect(payloadB).toEqual(['news']);
    expect(payloadC).toEqual(['news']);
    expect(payloadA).toEqual([]);

    subA.unsubscribe();
    subB.unsubscribe();
    subC.unsubscribe();
  });

  test('sendWithResponse resolves once responder replies through responseChannel', async () => {
    const responder = busB.on<AppMessage>('REQUEST_DATA').subscribe((msg) => {
      if (msg.requiresResponse) {
        busB.respond(msg, { answer: 42 });
      }
    });

    const response = await firstValueFrom(
      busA.sendWithResponse<{}, { answer: number }>('appB', 'REQUEST_DATA', {}),
    );

    expect(response).toEqual({ answer: 42 });

    responder.unsubscribe();
  });

  test('sendWithResponse rejects when timeout elapses without answer', () => {
    jest.useFakeTimers();
    const errors: Error[] = [];

    const sub = busA.sendWithResponse('appB', 'NEEDS_REPLY', {}).subscribe({
      error: (err) => {
        errors.push(err as Error);
      },
    });

    jest.advanceTimersByTime(60);
    jest.runOnlyPendingTimers();

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Timeout');

    sub.unsubscribe();
    jest.useRealTimers();
  });

  test('respond ignores messages that do not request response', () => {
    const spy = jest.spyOn(bridge, 'publish');

    const original: AppMessage = {
      id: 'msg1',
      source: 'appB',
      target: 'appA',
      type: 'PING',
      payload: null,
      timestamp: new Date().toISOString(),
    };

    busA.respond(original, { ok: true });

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
