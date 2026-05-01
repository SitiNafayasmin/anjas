import { Body, Controller, ForbiddenException, Get, Module, Param, Patch, Post, Req } from '@nestjs/common';
import { PrismaClient, type AuditAction } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticateSession } from './auth.module.js';

const prisma = new PrismaClient();

const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  planSlug: z.string().min(1).optional(),
});

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  monthlyPriceIdr: z.number().int().min(0).optional(),
  monthlyTokenQuota: z.number().int().positive().optional(),
  dailyRequestLimit: z.number().int().positive().optional(),
  requestsPerMinute: z.number().int().positive().optional(),
  maxConcurrentStreams: z.number().int().positive().optional(),
  allowedModelAliases: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});

const updateAliasSchema = z.object({
  description: z.string().min(1).optional(),
  fallbackModels: z.array(z.string().min(1)).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const providerSchema = z.object({
  provider: z.string().min(1),
  displayName: z.string().min(1),
  status: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

async function requireAdmin(request: FastifyRequest) {
  const user = await authenticateSession(request);

  if (user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }

  return user;
}

async function audit(actorId: string, action: AuditAction, targetId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}

@Controller('admin')
class AdminController {
  @Get('overview')
  async overview(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    const [users, activeUsers, activeKeys, requests24h, pendingPayments] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.apiKey.count({ where: { status: 'ACTIVE' } }),
      prisma.requestLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.paymentTransaction.count({ where: { status: 'PENDING' } }),
    ]);

    return { users, activeUsers, activeKeys, requests24h, pendingPayments };
  }

  @Get('analytics')
  async analytics(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [requests, usage, statusGroups, providerGroups, topUsers, payments] = await Promise.all([
      prisma.requestLog.count({ where: { createdAt: { gte: since } } }),
      prisma.usageEvent.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
        _avg: { latencyMs: true },
      }),
      prisma.requestLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.usageEvent.groupBy({
        by: ['provider'],
        where: { createdAt: { gte: since } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      prisma.usageEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      prisma.paymentTransaction.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { amountTotal: true },
      }),
    ]);

    return {
      windowDays: 30,
      totals: {
        requests,
        tokens: (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0),
        estimatedCost: usage._sum.estimatedCost?.toString() ?? '0',
        averageLatencyMs: Math.round(usage._avg.latencyMs ?? 0),
      },
      byStatus: statusGroups.map((group) => ({ status: group.status, count: group._count })),
      byProvider: providerGroups.map((group) => ({
        provider: group.provider ?? 'unknown',
        count: group._count,
        averageLatencyMs: Math.round(group._avg.latencyMs ?? 0),
      })),
      topUsers: topUsers.map((group) => ({
        userId: group.userId,
        requests: group._count,
        tokens: (group._sum.inputTokens ?? 0) + (group._sum.outputTokens ?? 0),
      })),
      payments: payments.map((group) => ({
        status: group.status,
        count: group._count,
        amountTotal: group._sum.amountTotal ?? 0,
      })),
    };
  }

  @Get('users')
  async users(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: { select: { apiKeys: true, requestLogs: true, payments: true } },
      },
    });

    return { users };
  }

  @Patch('users/:id')
  async updateUser(@Req() request: FastifyRequest, @Param('id') id: string, @Body() body: unknown) {
    const actor = await requireAdmin(request);
    const input = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: input.status,
        role: input.role,
      },
    });

    if (input.planSlug) {
      const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: input.planSlug } });
      await prisma.subscription.updateMany({
        where: { userId: id, status: { in: ['TRIAL', 'ACTIVE'] } },
        data: { status: 'CANCELED' },
      });
      await prisma.subscription.create({
        data: {
          userId: id,
          planId: plan.id,
          status: plan.monthlyPriceIdr > 0 ? 'ACTIVE' : 'TRIAL',
          currentEnd: plan.monthlyPriceIdr > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        },
      });
      await audit(actor.id, 'USER_PLAN_CHANGED', id, { planSlug: input.planSlug });
    }

    if (input.status === 'SUSPENDED') {
      await prisma.apiKey.updateMany({
        where: { userId: id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      await audit(actor.id, 'USER_SUSPENDED', id);
    } else if (input.status === 'ACTIVE') {
      await audit(actor.id, 'USER_UNSUSPENDED', id);
    }

    return { user };
  }

  @Get('plans')
  async plans(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    return { plans: await prisma.plan.findMany({ orderBy: { monthlyPriceIdr: 'asc' } }) };
  }

  @Patch('plans/:slug')
  async updatePlan(@Req() request: FastifyRequest, @Param('slug') slug: string, @Body() body: unknown) {
    await requireAdmin(request);
    const input = updatePlanSchema.parse(body);
    const plan = await prisma.plan.update({
      where: { slug },
      data: {
        ...input,
        monthlyTokenQuota: input.monthlyTokenQuota ? BigInt(input.monthlyTokenQuota) : undefined,
      },
    });

    return { plan };
  }

  @Get('model-aliases')
  async aliases(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    return { modelAliases: await prisma.modelAlias.findMany({ orderBy: { alias: 'asc' } }) };
  }

  @Patch('model-aliases/:alias')
  async updateAlias(@Req() request: FastifyRequest, @Param('alias') alias: string, @Body() body: unknown) {
    const actor = await requireAdmin(request);
    const input = updateAliasSchema.parse(body);
    const modelAlias = await prisma.modelAlias.update({ where: { alias }, data: input });
    await audit(actor.id, 'MODEL_ALIAS_UPDATED', modelAlias.id, input);

    return { modelAlias };
  }

  @Get('providers')
  async providers(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    return { providers: await prisma.providerAccount.findMany({ orderBy: { provider: 'asc' } }) };
  }

  @Post('providers')
  async upsertProvider(@Req() request: FastifyRequest, @Body() body: unknown) {
    await requireAdmin(request);
    const input = providerSchema.parse(body);
    const provider = await prisma.providerAccount.upsert({
      where: { provider: input.provider },
      update: input,
      create: {
        provider: input.provider,
        displayName: input.displayName,
        status: input.status,
        baseUrl: input.baseUrl,
        notes: input.notes,
      },
    });

    return { provider };
  }

  @Get('audit-logs')
  async auditLogs(@Req() request: FastifyRequest) {
    await requireAdmin(request);
    return {
      auditLogs: await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { actor: { select: { email: true } } },
      }),
    };
  }
}

@Module({
  controllers: [AdminController],
})
export class AdminModule {}
