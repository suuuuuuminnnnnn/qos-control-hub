import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AlsService } from '../als/als.service';

@Injectable()
export class DeviceContextGuard implements CanActivate {
  constructor(private readonly alsService: AlsService) {}

  canActivate(_context: ExecutionContext): boolean {
    const store = this.alsService.getStore();
    console.log(
      `[DeviceContextGuard] correlationId=${store?.correlationId} deviceId=${store?.deviceId}`,
    );
    return true;
  }
}
