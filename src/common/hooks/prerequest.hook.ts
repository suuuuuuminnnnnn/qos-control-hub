import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AlsService } from '../als/als.service';
import { AlsStore } from '../als/als.types';

export type PreRequestHook = (
  context: ExecutionContext,
  next: () => Observable<unknown>,
) => Observable<unknown> | Promise<Observable<unknown>>;

export function makePreRequestHook(alsService: AlsService): PreRequestHook {
  return (context: ExecutionContext, next: () => Observable<unknown>) => {
    const data = context.switchToRpc().getData<Record<string, unknown>>();
    const store: AlsStore = {
      correlationId: uuidv4(),
      deviceId: data?.deviceId as string | undefined,
      commandId: data?.commandId as string | undefined,
      transport: 'mqtt',
    };
    return new Observable((subscriber) => {
      alsService.run(store, () => next().subscribe(subscriber));
    });
  };
}
