import { Controller, Param, Post } from '@nestjs/common';
import { AlsService } from '../common/als/als.service';
import { DeviceService } from './device.service';

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly alsService: AlsService,
  ) {}

  @Post(':deviceId/stop')
  async stop(
    @Param('deviceId') deviceId: string,
  ): Promise<Record<string, unknown>> {
    const commandId = await this.deviceService.publishStop(deviceId);
    const store = this.alsService.getStore();
    return { commandId, correlationId: store?.correlationId, status: 'sent' };
  }
}
