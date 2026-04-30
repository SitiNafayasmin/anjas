CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED');
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "UsageStatus" AS ENUM ('SUCCESS', 'ERROR', 'RATE_LIMITED', 'QUOTA_EXCEEDED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPriceIdr" INTEGER NOT NULL DEFAULT 0,
  "monthlyTokenQuota" BIGINT NOT NULL,
  "dailyRequestLimit" INTEGER NOT NULL,
  "requestsPerMinute" INTEGER NOT NULL,
  "maxConcurrentStreams" INTEGER NOT NULL,
  "allowedModelAliases" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "currentStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelAlias" (
  "id" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "fallbackModels" TEXT[],
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModelAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "modelAlias" TEXT NOT NULL,
  "resolvedModel" TEXT,
  "provider" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "status" "UsageStatus" NOT NULL,
  "latencyMs" INTEGER,
  "estimatedCost" DECIMAL(12,6),
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequestLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "apiKeyId" TEXT,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "modelAlias" TEXT,
  "resolvedModel" TEXT,
  "provider" TEXT,
  "status" "UsageStatus" NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "errorCode" TEXT,
  "latencyMs" INTEGER,
  "requestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'qris',
  "providerTransactionId" TEXT,
  "orderId" TEXT NOT NULL,
  "amountOriginal" INTEGER NOT NULL,
  "amountUnique" INTEGER NOT NULL DEFAULT 0,
  "amountTotal" INTEGER NOT NULL,
  "qrisContent" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "rawProviderResponse" JSONB,
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_status_idx" ON "ApiKey"("userId", "status");
CREATE UNIQUE INDEX "ModelAlias_alias_key" ON "ModelAlias"("alias");
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");
CREATE INDEX "UsageEvent_apiKeyId_createdAt_idx" ON "UsageEvent"("apiKeyId", "createdAt");
CREATE INDEX "UsageEvent_requestId_idx" ON "UsageEvent"("requestId");
CREATE UNIQUE INDEX "RequestLog_requestId_key" ON "RequestLog"("requestId");
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");
CREATE INDEX "RequestLog_userId_createdAt_idx" ON "RequestLog"("userId", "createdAt");
CREATE INDEX "RequestLog_apiKeyId_createdAt_idx" ON "RequestLog"("apiKeyId", "createdAt");
CREATE UNIQUE INDEX "PaymentTransaction_orderId_key" ON "PaymentTransaction"("orderId");
CREATE INDEX "PaymentTransaction_userId_createdAt_idx" ON "PaymentTransaction"("userId", "createdAt");
CREATE INDEX "PaymentTransaction_providerTransactionId_idx" ON "PaymentTransaction"("providerTransactionId");
CREATE INDEX "PaymentTransaction_status_expiresAt_idx" ON "PaymentTransaction"("status", "expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "slug", "name", "monthlyPriceIdr", "monthlyTokenQuota", "dailyRequestLimit", "requestsPerMinute", "maxConcurrentStreams", "allowedModelAliases", "updatedAt")
VALUES
  ('plan_trial', 'trial', 'Free Trial', 0, 100000, 50, 5, 1, ARRAY['coding-free'], CURRENT_TIMESTAMP),
  ('plan_pro', 'pro', 'Pro', 99000, 5000000, 2000, 60, 5, ARRAY['coding-fast', 'coding-cheap', 'coding-smart'], CURRENT_TIMESTAMP);
