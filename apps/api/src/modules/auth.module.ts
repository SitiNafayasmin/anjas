import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Module,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '../config.js';
import { emailButton, sendEmail } from '../lib/email.js';
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

const emailSchema = z.object({
  email: z.string().email().max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
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

export async function requireVerifiedSession(request: FastifyRequest) {
  const user = await authenticateSession(request);

  if (!user.emailVerifiedAt) {
    throw new ForbiddenException('Email verification required');
  }

  return user;
}

async function sendVerificationEmail(userId: string, email: string) {
  const config = loadConfig();
  const token = `verify_${randomToken(32)}`;
  const url = `${config.appPublicUrl}/login?verifyToken=${encodeURIComponent(token)}`;

  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hmacSha256Hex(config.sessionSecret, token),
      type: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return sendEmail({
    to: email,
    subject: 'Verify your 9router SaaS account',
    html: `<p>Verify your email to secure your 9router SaaS account.</p>${emailButton(url, 'Verify email')}`,
  });
}

async function sendPasswordResetEmail(userId: string, email: string) {
  const config = loadConfig();
  const token = `reset_${randomToken(32)}`;
  const url = `${config.appPublicUrl}/login?resetToken=${encodeURIComponent(token)}`;

  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hmacSha256Hex(config.sessionSecret, token),
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return sendEmail({
    to: email,
    subject: 'Reset your 9router SaaS password',
    html: `<p>Use this secure link to reset your password.</p>${emailButton(url, 'Reset password')}`,
  });
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
    await sendVerificationEmail(user.id, user.email);
    const session = await createSession(user.id);

    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      },
    };
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const input = loginSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user?.passwordHash || user.status !== 'ACTIVE' || !(await verify(user.passwordHash, input.password))) {
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
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
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
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      },
    };
  }

  @Post('resend-verification')
  async resendVerification(@Req() request: FastifyRequest) {
    const user = await authenticateSession(request);

    if (user.emailVerifiedAt) {
      return { ok: true, alreadyVerified: true };
    }

    await sendVerificationEmail(user.id, user.email);
    return { ok: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string | undefined) {
    const config = loadConfig();

    if (!token) {
      throw new UnauthorizedException('Missing verification token');
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { tokenHash: hmacSha256Hex(config.sessionSecret, token) },
    });

    if (
      !verificationToken ||
      verificationToken.type !== 'EMAIL_VERIFY' ||
      verificationToken.usedAt ||
      verificationToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid verification token');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: unknown) {
    const input = emailSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (user) {
      await sendPasswordResetEmail(user.id, user.email);
    }

    return { ok: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: unknown) {
    const input = resetPasswordSchema.parse(body);
    const config = loadConfig();
    const resetToken = await prisma.verificationToken.findUnique({
      where: { tokenHash: hmacSha256Hex(config.sessionSecret, input.token) },
    });

    if (
      !resetToken ||
      resetToken.type !== 'PASSWORD_RESET' ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid reset token');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await hash(input.password) },
      }),
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
      prisma.verificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }
}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
