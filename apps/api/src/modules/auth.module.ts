import { Body, Controller, Get, Headers, Module, Post, Req, UnauthorizedException } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '../config.js';
import { hmacSha256Hex, randomToken } from '../lib/crypto.js';
import { getBearerToken } from '../lib/request.js';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(100).optional(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

async function createSession(userId: string) {
  const config = loadConfig();
  const token = `sess_${randomToken(32)}`;
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hmacSha256Hex(config.sessionSecret, token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function authenticateSession(request: FastifyRequest) {
  const config = loadConfig();
  const token = getBearerToken(request);

  if (!token) {
    throw new UnauthorizedException('Missing session token');
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hmacSha256Hex(config.sessionSecret, token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new UnauthorizedException('Invalid session token');
  }

  return session.user;
}

@Controller('auth')
class AuthController {
  @Post('register')
  async register(@Body() body: unknown) {
    const input = registerSchema.parse(body);
    const passwordHash = await hash(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        subscriptions: {
          create: {
            plan: {
              connectOrCreate: {
                where: { slug: 'trial' },
                create: {
                  slug: 'trial',
                  name: 'Free Trial',
                  monthlyPriceIdr: 0,
                  monthlyTokenQuota: 100_000,
                  dailyRequestLimit: 50,
                  requestsPerMinute: 5,
                  maxConcurrentStreams: 1,
                  allowedModelAliases: ['coding-free'],
                },
              },
            },
          },
        },
      },
    });
    const session = await createSession(user.id);

    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const input = loginSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user?.passwordHash || !(await verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const session = await createSession(user.id);

    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization: string | undefined) {
    if (authorization?.startsWith('Bearer ')) {
      const config = loadConfig();
      await prisma.session.deleteMany({
        where: {
          tokenHash: hmacSha256Hex(
            config.sessionSecret,
            authorization.slice('Bearer '.length).trim(),
          ),
        },
      });
    }

    return { ok: true };
  }

  @Get('me')
  async me(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
