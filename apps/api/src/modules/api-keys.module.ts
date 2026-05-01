import { PrismaClient } from '@prisma/client';
import { Body, Controller, Delete, Get, Module, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createApiKey } from '../lib/crypto.js';
import { requireVerifiedSession } from './auth.module.js';

const prisma = new PrismaClient();

const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
});

@Controller('api-keys')
class ApiKeysController {
  @Get()
  async listApiKeys(@Req() request: FastifyRequest) {
    const user = await requireVerifiedSession(request);
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return { apiKeys };
  }

  @Post()
  async createApiKey(@Req() request: FastifyRequest, @Body() body: unknown) {
    const user = await requireVerifiedSession(request);
    const input = createApiKeySchema.parse(body);
    const generated = createApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: input.name,
        prefix: generated.prefix,
        keyHash: generated.hash,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      apiKey,
      key: generated.key,
    };
  }

  @Get(':id')
  async getApiKey(@Req() request: FastifyRequest, @Param('id') id: string) {
    const user = await requireVerifiedSession(request);
    const apiKey = await prisma.apiKey.findFirstOrThrow({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return { apiKey };
  }

  @Delete(':id')
  async revokeApiKey(@Req() request: FastifyRequest, @Param('id') id: string) {
    const user = await requireVerifiedSession(request);
    const apiKey = await prisma.apiKey.updateMany({
      where: { id, userId: user.id, status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    return {
      ok: apiKey.count > 0,
    };
  }
}

@Module({
  controllers: [ApiKeysController],
})
export class ApiKeysModule {}
