import { Controller, Get, Module, Req } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { authenticateSession } from './auth.module.js';

const prisma = new PrismaClient();

@Controller('usage')
class UsageController {
  @Get('summary')
  async summary(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [usage, requestsToday, logs] = await Promise.all([
      prisma.usageEvent.aggregate({
        where: { userId: user.id, createdAt: { gte: monthStart } },
        _sum: { inputTokens: true, outputTokens: true },
        _count: true,
      }),
      prisma.requestLog.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.requestLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      monthlyRequests: usage._count,
      monthlyInputTokens: usage._sum.inputTokens ?? 0,
      monthlyOutputTokens: usage._sum.outputTokens ?? 0,
      requestsLast24h: requestsToday,
      recentLogs: logs,
    };
  }
}

@Module({
  controllers: [UsageController],
})
export class UsageModule {}
