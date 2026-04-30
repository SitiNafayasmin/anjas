import { Controller, Get, Module } from '@nestjs/common';

const plans = [
  {
    slug: 'trial',
    name: 'Free Trial',
    aliases: ['coding-free'],
    requestsPerMinute: 5,
  },
  {
    slug: 'pro',
    name: 'Pro',
    aliases: ['coding-fast', 'coding-cheap', 'coding-smart'],
    requestsPerMinute: 60,
  },
];

@Controller('plans')
class PlansController {
  @Get()
  listPlans() {
    return { plans };
  }
}

@Module({
  controllers: [PlansController],
})
export class PlansModule {}
