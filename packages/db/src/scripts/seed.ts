import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    slug: 'trial',
    name: 'Free Trial',
    monthlyPriceIdr: 0,
    monthlyTokenQuota: 100_000,
    dailyRequestLimit: 50,
    requestsPerMinute: 5,
    maxConcurrentStreams: 1,
    allowedModelAliases: ['coding-free'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    monthlyPriceIdr: 99_000,
    monthlyTokenQuota: 5_000_000,
    dailyRequestLimit: 2_000,
    requestsPerMinute: 60,
    maxConcurrentStreams: 5,
    allowedModelAliases: ['coding-fast', 'coding-cheap', 'coding-smart'],
  },
];

for (const plan of plans) {
  await prisma.plan.upsert({
    where: { slug: plan.slug },
    update: plan,
    create: plan,
  });
}

await prisma.modelAlias.upsert({
  where: { alias: 'coding-free' },
  update: {
    description: 'Trial and emergency fallback coding model route',
    fallbackModels: ['openrouter/free', 'opencode/free'],
  },
  create: {
    alias: 'coding-free',
    description: 'Trial and emergency fallback coding model route',
    fallbackModels: ['openrouter/free', 'opencode/free'],
  },
});

await prisma.modelAlias.upsert({
  where: { alias: 'coding-fast' },
  update: {
    description: 'Fast coding route for paid plans',
    fallbackModels: ['groq/fast', 'cerebras/fast'],
  },
  create: {
    alias: 'coding-fast',
    description: 'Fast coding route for paid plans',
    fallbackModels: ['groq/fast', 'cerebras/fast'],
  },
});

await prisma.modelAlias.upsert({
  where: { alias: 'coding-cheap' },
  update: {
    description: 'Low-cost coding route for paid plans',
    fallbackModels: ['glm/cheap', 'deepseek/cheap'],
  },
  create: {
    alias: 'coding-cheap',
    description: 'Low-cost coding route for paid plans',
    fallbackModels: ['glm/cheap', 'deepseek/cheap'],
  },
});

await prisma.modelAlias.upsert({
  where: { alias: 'coding-smart' },
  update: {
    description: 'Higher quality coding route for paid plans',
    fallbackModels: ['kimi/k2', 'minimax/m2', 'glm/smart'],
  },
  create: {
    alias: 'coding-smart',
    description: 'Higher quality coding route for paid plans',
    fallbackModels: ['kimi/k2', 'minimax/m2', 'glm/smart'],
  },
});

await prisma.$disconnect();

console.log('Seeded plans and model aliases');
