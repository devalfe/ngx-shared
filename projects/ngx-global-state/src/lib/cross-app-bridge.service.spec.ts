import { CrossAppBridgeService } from './cross-app-bridge.service';

jest.mock('@angular/core', () => ({
  Injectable: () => (target: any) => target,
  InjectionToken: class {
    constructor(public description: string) {}
  },
  Inject: () => () => undefined,
  Optional: () => () => undefined,
}));

describe('CrossAppBridgeService', () => {
  let service: CrossAppBridgeService;

  beforeEach(() => {
    service = new CrossAppBridgeService({
      transport: 'none',
      namespace: 'spec',
      protocolVersion: 1,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  test('listen should receive messages published on the same channel', () => {
    const received: any[] = [];
    const sub = service.listen<any>('channel-1').subscribe((msg) => received.push(msg));

    service.publish('channel-1', { a: 1 });
    service.publish('channel-1', { b: 2 });

    expect(received).toEqual([{ a: 1 }, { b: 2 }]);

    sub.unsubscribe();
  });

  test('multiple subscribers on same channel should all receive messages', () => {
    const a: any[] = [];
    const b: any[] = [];

    const sub1 = service.listen<any>('topic').subscribe((m) => a.push(m));
    const sub2 = service.listen<any>('topic').subscribe((m) => b.push(m));

    service.publish('topic', 'hello');
    service.publish('topic', 'world');

    expect(a).toEqual(['hello', 'world']);
    expect(b).toEqual(['hello', 'world']);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  test('publishing to a channel with no listeners should not throw', () => {
    expect(() => service.publish('no-listeners', 123)).not.toThrow();
    const received: number[] = [];
    const sub = service.listen<number>('no-listeners').subscribe((v) => received.push(v));

    expect(received).toEqual([]);

    service.publish('no-listeners', 456);
    expect(received).toEqual([456]);

    sub.unsubscribe();
  });

  test('different channels should be isolated', () => {
    const a: any[] = [];
    const b: any[] = [];

    const subA = service.listen('A').subscribe((m) => a.push(m));
    const subB = service.listen('B').subscribe((m) => b.push(m));

    service.publish('A', 'msgA1');
    service.publish('B', 'msgB1');
    service.publish('A', 'msgA2');

    expect(a).toEqual(['msgA1', 'msgA2']);
    expect(b).toEqual(['msgB1']);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  test('late subscriber should not receive past messages (no replay)', () => {
    const early: any[] = [];
    const late: any[] = [];

    const subEarly = service.listen('topic2').subscribe((m) => early.push(m));
    service.publish('topic2', 1);
    service.publish('topic2', 2);

    const subLate = service.listen('topic2').subscribe((m) => late.push(m));

    service.publish('topic2', 3);
    service.publish('topic2', 4);

    expect(early).toEqual([1, 2, 3, 4]);
    expect(late).toEqual([3, 4]);

    subEarly.unsubscribe();
    subLate.unsubscribe();
  });
});
