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

  @Get('analytics')
  async analytics(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totals, statusGroups, modelGroups, providerGroups, apiKeyGroups, logs] = await Promise.all([
      prisma.usageEvent.aggregate({
        where: { userId: user.id, createdAt: { gte: since } },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
        _avg: { latencyMs: true },
      }),
      prisma.requestLog.groupBy({
        by: ['status'],
        where: { userId: user.id, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.usageEvent.groupBy({
        by: ['modelAlias'],
        where: { userId: user.id, createdAt: { gte: since } },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true },
      }),
      prisma.usageEvent.groupBy({
        by: ['provider'],
        where: { userId: user.id, createdAt: { gte: since } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      prisma.requestLog.groupBy({
        by: ['apiKeyId'],
        where: { userId: user.id, createdAt: { gte: since }, apiKeyId: { not: null } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      prisma.requestLog.findMany({
        where: { userId: user.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      windowDays: 30,
      totals: {
        requests: totals._count,
        inputTokens: totals._sum.inputTokens ?? 0,
        outputTokens: totals._sum.outputTokens ?? 0,
        estimatedCost: totals._sum.estimatedCost?.toString() ?? '0',
        averageLatencyMs: Math.round(totals._avg.latencyMs ?? 0),
      },
      byStatus: statusGroups.map((group) => ({ status: group.status, count: group._count })),
      byModel: modelGroups.map((group) => ({
        modelAlias: group.modelAlias,
        count: group._count,
        tokens: (group._sum.inputTokens ?? 0) + (group._sum.outputTokens ?? 0),
      })),
      byProvider: providerGroups.map((group) => ({
        provider: group.provider ?? 'unknown',
        count: group._count,
        averageLatencyMs: Math.round(group._avg.latencyMs ?? 0),
      })),
      byApiKey: apiKeyGroups.map((group) => ({
        apiKeyId: group.apiKeyId,
        count: group._count,
        averageLatencyMs: Math.round(group._avg.latencyMs ?? 0),
      })),
      logs,
    };
  }
}

@Module({
  controllers: [UsageController],
})
export class UsageModule {}
