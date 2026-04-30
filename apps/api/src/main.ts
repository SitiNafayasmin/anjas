import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ArgumentsHost } from '@nestjs/common';
import { ZodError } from 'zod';
import { loadConfig } from './config.js';
import { AppModule } from './modules/app.module.js';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1_048_576, logger: true }),
  );

  app.enableCors({
    origin: config.webOrigins,
    credentials: true,
  });

  app.useGlobalFilters({
    catch(error: unknown, host: ArgumentsHost) {
      if (error instanceof ZodError) {
        const response = host.switchToHttp().getResponse();
        return response.status(400).send({
          statusCode: 400,
          message: 'Invalid request body',
          issues: error.issues,
        });
      }

      throw error;
    },
  });

  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
