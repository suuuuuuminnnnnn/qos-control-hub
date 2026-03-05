import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  MqttContext,
  Transport,
} from '@nestjs/microservices';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Observable } from 'rxjs';
import { AppModule } from './app.module';
import { AlsService } from './common/als/als.service';
import {
  makePreRequestHook,
  PreRequestHook,
} from './common/hooks/prerequest.hook';

type ProcessingStartHook = (
  transportId: unknown,
  context: unknown,
  done: () => void | Promise<void>,
) => void;

interface ServerWithHook {
  setOnProcessingStartHook(hook: ProcessingStartHook): void;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const alsService = app.get(AlsService);

  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: { url: process.env.MQTT_URL ?? 'mqtt://localhost:1883' },
  });

  registerPreRequestHook(microservice, makePreRequestHook(alsService));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
  console.log(`HTTP server listening on port ${process.env.PORT ?? 3000}`);
}

function registerPreRequestHook(
  microservice: { serverInstance?: unknown },
  hook: PreRequestHook,
): void {
  const server = (microservice as { serverInstance: ServerWithHook })
    .serverInstance;

  if (!server || typeof server.setOnProcessingStartHook !== 'function') {
    console.warn(
      '[PreRequestHook] setOnProcessingStartHook not available on server instance',
    );
    return;
  }

  server.setOnProcessingStartHook(
    (
      _transportId: unknown,
      ctx: unknown,
      done: () => void | Promise<void>,
    ): void => {
      const mqttCtx = ctx as MqttContext;
      let parsedData: Record<string, unknown> = {};
      try {
        const packet = mqttCtx.getPacket() as { payload?: Buffer | string };
        if (packet?.payload) {
          parsedData = JSON.parse(packet.payload.toString()) as Record<
            string,
            unknown
          >;
        }
      } catch {
        // non-JSON payload — leave parsedData empty
      }

      const execCtx = new ExecutionContextHost([parsedData, mqttCtx]);
      execCtx.setType('rpc');

      const next = (): Observable<unknown> =>
        new Observable<unknown>((sub) => {
          Promise.resolve(done())
            .then(() => {
              sub.next(undefined);
              sub.complete();
            })
            .catch((err) => sub.error(err as Error));
        });

      const result = hook(execCtx, next);
      void Promise.resolve(result).then((obs$) =>
        obs$.subscribe({
          error: (err: unknown) => console.error('[PreRequestHook error]', err),
        }),
      );
    },
  );
}

void bootstrap();
