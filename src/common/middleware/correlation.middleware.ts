import git{ Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AlsService } from '../als/als.service';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly alsService: AlsService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    this.alsService.run(
      {
        correlationId: uuidv4(),
        transport: 'http',
      },
      () => next(),
    );
  }
}
