import { Body, Controller, ForbiddenException, Module, Post, Req } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '../config.js';
import { authenticateSession } from './auth.module.js';

const prisma = new PrismaClient();

const cleanupSchema = z.object({
  requestLogRetentionDays: z.number().int().positive().optional(),
});

async function requireAdmin(request: FastifyRequest) {
  const user = await authenticateSession(request);

  if (user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }

  return user;
}

async function runCleanup(input: { requestLogRetentionDays?: number } = {}) {
  const config = loadConfig();
  const retentionDays = input.requestLogRetentionDays ?? config.requestLogRetentionDays;
  const requestLogCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [expiredSessions, oldRequestLogs, expiredPayments, expiredTokens, expiredSubscriptions] =
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.requestLog.deleteMany({ where: { createdAt: { lt: requestLogCutoff } } }),
      prisma.paymentTransaction.updateMany({
        where: { status: 'PENDING', expiresAt: { lt: now } },
        data: { status: 'EXPIRED' },
      }),
      prisma.verificationToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      }),
      prisma.subscription.updateMany({
        where: { status: 'ACTIVE', currentEnd: { lt: now } },
        data: { status: 'SUSPENDED' },
      }),
    ]);

  return {
    expiredSessions: expiredSessions.count,
    oldRequestLogs: oldRequestLogs.count,
    expiredPayments: expiredPayments.count,
    expiredTokens: expiredTokens.count,
    expiredSubscriptions: expiredSubscriptions.count,
  };
}

@Controller('workers')
class WorkersController {
  @Post('cleanup')
  async cleanup(@Req() request: FastifyRequest, @Body() body: unknown) {
    await requireAdmin(request);
    const input = cleanupSchema.parse(body ?? {});
    return runCleanup(input);
  }
}

@Module({
  controllers: [WorkersController],
})
export class WorkersModule {}

export { runCleanup };
