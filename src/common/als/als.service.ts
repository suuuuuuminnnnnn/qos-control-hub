import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { AlsStore } from './als.types';

@Injectable()
export class AlsService {
  private readonly als = new AsyncLocalStorage<AlsStore>();

  run<T>(store: AlsStore, cb: () => T): T {
    return this.als.run(store, cb);
  }

  getStore(): AlsStore | undefined {
    return this.als.getStore();
  }
}
