import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AlsModule } from './common/als/als.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { DeviceModule } from './device/device.module';
import { APP_GUARD } from '@nestjs/core';
import { DeviceContextGuard } from './common/guards/device-context.guard';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AckModule } from './ack/ack.module';

@Module({
  imports: [AlsModule, DeviceModule, TelemetryModule, AckModule],
  providers: [{ provide: APP_GUARD, useClass: DeviceContextGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
