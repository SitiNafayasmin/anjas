import { Controller, Get, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    slug: 'trial',
    name: 'Free Trial',
    aliases: ['coding-free'],
    monthlyPriceIdr: 0,
    monthlyTokenQuota: 100_000,
    dailyRequestLimit: 50,
    requestsPerMinute: 5,
    maxConcurrentStreams: 1,
  },
  {
    slug: 'pro',
    name: 'Pro',
    aliases: ['coding-fast', 'coding-cheap', 'coding-smart'],
    monthlyPriceIdr: 99_000,
    monthlyTokenQuota: 5_000_000,
    dailyRequestLimit: 2_000,
    requestsPerMinute: 60,
    maxConcurrentStreams: 5,
  },
];

@Controller('plans')
class PlansController {
  @Get()
  async listPlans() {
    const dbPlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceIdr: 'asc' },
    });

    if (dbPlans.length === 0) {
      return { plans };
    }

    return {
      plans: dbPlans.map((plan) => ({
        slug: plan.slug,
        name: plan.name,
        aliases: plan.allowedModelAliases,
        monthlyPriceIdr: plan.monthlyPriceIdr,
        monthlyTokenQuota: plan.monthlyTokenQuota.toString(),
        dailyRequestLimit: plan.dailyRequestLimit,
        requestsPerMinute: plan.requestsPerMinute,
        maxConcurrentStreams: plan.maxConcurrentStreams,
      })),
    };
  }
}

@Module({
  controllers: [PlansController],
})
export class PlansModule {}
