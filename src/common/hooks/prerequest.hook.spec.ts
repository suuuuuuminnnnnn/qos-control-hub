import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { AlsModule } from '../als/als.module';
import { AlsService } from '../als/als.service';
import { AlsStore } from '../als/als.types';
import { makePreRequestHook } from './prerequest.hook';

describe('makePreRequestHook', () => {
  let alsService: AlsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AlsModule],
    }).compile();

    alsService = moduleRef.get(AlsService);
  });

  it('next() 내부에서 als.getStore()가 유효한 store를 반환한다', async () => {
    const hook = makePreRequestHook(alsService);

    const mockData = { deviceId: 'dev-001', battery: 80, ts: Date.now() };
    const mockContext = {
      switchToRpc: () => ({
        getData: () => mockData,
        getContext: () => ({}),
      }),
    } as unknown as ExecutionContext;

    let capturedStore: AlsStore | undefined;

    const next = () => {
      capturedStore = alsService.getStore();
      return of<unknown>(undefined);
    };

    const obs$ = await Promise.resolve(hook(mockContext, next));
    await firstValueFrom(obs$);

    expect(capturedStore).toBeDefined();
    expect(capturedStore!.correlationId).toBeTruthy();
    expect(capturedStore!.deviceId).toBe('dev-001');
    expect(capturedStore!.transport).toBe('mqtt');
  });
});
