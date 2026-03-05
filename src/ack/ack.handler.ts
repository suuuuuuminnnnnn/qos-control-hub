import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AlsService } from '../common/als/als.service';

interface AckPayload {
  commandId: string;
  status: string;
  deviceId: string;
}

@Controller()
export class AckHandler {
  constructor(private readonly alsService: AlsService) {}

  @MessagePattern('devices/+/acks', { extras: { qos: 1 } })
  handle(@Payload() data: AckPayload): void {
    const store = this.alsService.getStore();
    console.log(
      `[ack|qos1] corr=${store?.correlationId} cmd=${data.commandId} status=${data.status}`,
    );
  }
}
