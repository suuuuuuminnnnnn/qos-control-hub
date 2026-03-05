import { Module } from '@nestjs/common';
import { TelemetryHandler } from './telemetry.handler';

@Module({
  controllers: [TelemetryHandler],
})
export class TelemetryModule {}
