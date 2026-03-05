import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DeviceService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;

  onModuleInit(): void {
    this.client = mqtt.connect(process.env.MQTT_URL ?? 'mqtt://localhost:1883');
  }

  async publishStop(deviceId: string): Promise<string> {
    const commandId = uuidv4();
    await this.client.publishAsync(
      `devices/${deviceId}/commands/stop`,
      JSON.stringify({
        commandId,
        deviceId,
        ts: Date.now(),
        type: 'stop_motor',
      }),
      { qos: 2 },
    );
    return commandId;
  }

  onModuleDestroy(): void {
    this.client.end();
  }
}
