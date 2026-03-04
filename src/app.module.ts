import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AlsModule } from './common/als/als.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { DeviceModule } from './device/device.module';

@Module({
  imports: [AlsModule, DeviceModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
