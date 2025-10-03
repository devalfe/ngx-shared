import { MessageBusService, AppMessage } from './message-bus.service';
import { CrossAppBridgeService } from './cross-app-bridge.service';

// Avoid pulling Angular ESM into Jest by mocking @angular/core
jest.mock('@angular/core', () => ({ Injectable: () => (target: any) => target }));

describe('MessageBusService', () => {
  let bridge: CrossAppBridgeService;
  let busA: MessageBusService; // acts as sender or receiver depending on test
  let busB: MessageBusService; // optional second participant

  const appA = 'appA';
  const appB = 'appB';

  beforeEach(() => {
    bridge = new CrossAppBridgeService();
    busA = new MessageBusService(bridge);
    busB = new MessageBusService(bridge);
  });

  test('send should deliver payload to subscribers of the given type', (done) => {
    const received: any[] = [];
    const sub = busA.onMessage<number>('ADD').subscribe((v) => {
      received.push(v);
      expect(received).toEqual([5]);
      sub.unsubscribe();
      done();
    });

    busA.send(appB, 'ADD', 5, appA);
  });

  test('broadcast should deliver payload to subscribers of the type', (done) => {
    const sub = busA.onMessage<string>('PING').subscribe((msg) => {
      expect(msg).toBe('hello');
      sub.unsubscribe();
      done();
    });

    busA.broadcast('PING', 'hello', appA);
  });

  test('type filtering: only matching type should be received', () => {
    const a: any[] = [];
    const b: any[] = [];

    const subA = busA.onMessage<string>('TYPE_A').subscribe((v) => a.push(v));
    const subB = busA.onMessage<string>('TYPE_B').subscribe((v) => b.push(v));

    busA.send(appB, 'TYPE_A', 'one', appA);
    busA.send(appB, 'TYPE_B', 'two', appA);
    busA.send(appB, 'TYPE_A', 'three', appA);

    expect(a).toEqual(['one', 'three']);
    expect(b).toEqual(['two']);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  test('multiple subscribers to same type all receive', () => {
    const r1: string[] = [];
    const r2: string[] = [];

    const s1 = busA.onMessage<string>('EVT').subscribe((v) => r1.push(v));
    const s2 = busA.onMessage<string>('EVT').subscribe((v) => r2.push(v));

    busA.send(appB, 'EVT', 'x', appA);
    busA.send(appB, 'EVT', 'y', appA);

    expect(r1).toEqual(['x', 'y']);
    expect(r2).toEqual(['x', 'y']);

    s1.unsubscribe();
    s2.unsubscribe();
  });

  test('late subscribers do not receive past messages (no replay)', () => {
    // Send it before subscribing
    busA.send(appB, 'ONCE', 1, appA);

    const received: number[] = [];
    const sub = busA.onMessage<number>('ONCE').subscribe((v) => received.push(v));

    // Send after subscribing
    busA.send(appB, 'ONCE', 2, appA);

    expect(received).toEqual([2]);
    sub.unsubscribe();
  });

  test('sendWithResponse: requester receives a single response via responseChannel', (done) => {
    // Simulate appB acting as responder by listening to the raw bridge channel
    // @ts-ignore
    const rawSub = (bridge as any).listen<AppMessage>('bus').subscribe((msg: AppMessage) => {
      if (msg.type === 'GET_DATA' && msg.requiresResponse && msg.responseChannel) {
        // Prepare some response
        const data = { value: 42 };
        // Use busB to respond to an original message
        busB.respond(msg, data, appB);
      }
    });

    const resValues: Array<{ value: number }> = [];
    const res$ = busA.sendWithResponse<{}, { value: number }>(appB, 'GET_DATA', {}, appA);
    res$.subscribe({
      next: (val) => resValues.push(val),
      complete: () => {
        expect(resValues).toEqual([{ value: 42 }]);
        rawSub.unsubscribe();
        done();
      },
    });
  });

  test('respond is a no-op when message does not require response', () => {
    const spy = jest.spyOn(bridge as any, 'publish');

    const msg: AppMessage = {
      id: 'x',
      source: appA,
      target: appB,
      type: 'ANY',
      payload: null,
      timestamp: new Date(),
      // requiresResponse: undefined
      // responseChannel: undefined
    };

    busA.respond(msg, { ok: true }, appA);

    // publish should not be called with a response channel
    // It may be called by other tests; assert that it was not called with responseChannel semantics
    const calls = spy.mock.calls.filter((c) => c[0] === 'bus');
    const anyResponsePublish = calls.some(([, payload]) =>
      (payload as AppMessage).type?.startsWith('msg_'),
    );
    expect(anyResponsePublish).toBe(false);

    spy.mockRestore();
  });
});
