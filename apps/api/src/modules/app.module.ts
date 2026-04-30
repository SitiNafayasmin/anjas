import { Module } from '@nestjs/common';
import { ApiKeysModule } from './api-keys.module.js';
import { AuthModule } from './auth.module.js';
import { HealthModule } from './health.module.js';
import { PaymentsModule } from './payments.module.js';
import { PlansModule } from './plans.module.js';
import { UsageModule } from './usage.module.js';

@Module({
  imports: [HealthModule, AuthModule, PlansModule, ApiKeysModule, UsageModule, PaymentsModule],
})
export class AppModule {}
