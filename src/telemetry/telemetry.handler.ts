import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AlsService } from '../common/als/als.service';
import { DeviceContextGuard } from '../common/guards/device-context.guard';

interface TelemetryPayload {
  deviceId: string;
  battery: number;
  ts: number;
}

@Controller()
export class TelemetryHandler {
  constructor(private readonly alsService: AlsService) {}

  @UseGuards(DeviceContextGuard)
  @MessagePattern('devices/+/telemetry', { extras: { qos: 0 } })
  handle(@Payload() data: TelemetryPayload): void {
    const store = this.alsService.getStore();
    console.log(
      `[telemetry|qos0] corr=${store?.correlationId} dev=${data.deviceId} bat=${data.battery}`,
    );
  }
}
