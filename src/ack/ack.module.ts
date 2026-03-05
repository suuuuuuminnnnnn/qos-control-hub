import { Module } from '@nestjs/common';
import { AckHandler } from './ack.handler';

@Module({
  controllers: [AckHandler],
})
export class AckModule {}
