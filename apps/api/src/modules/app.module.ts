import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys.module.js';
import { HealthModule } from './health.module.js';
import { PlansModule } from './plans.module.js';

@Module({
  imports: [HealthModule, PlansModule, ApiKeysModule],
})
export class AppModule {}
