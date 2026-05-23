import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisLockService } from '../common/redis-lock.service';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import CircuitBreaker from 'opossum';

@Injectable()
export class PaymentService {
  private breaker: CircuitBreaker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisLock: RedisLockService,
    @InjectQueue('payment-retry') private readonly retryQueue: Queue,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // Circuit breaker for gateway calls
    this.breaker = new CircuitBreaker(
      async (payment: any) => this.mockGatewayCharge(payment),
      {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.breaker.on('open', () => this.logger.warn('Circuit OPEN'));
    this.breaker.on('halfOpen', () => this.logger.warn('Circuit HALF-OPEN'));
    this.breaker.on('close', () => this.logger.info('Circuit CLOSED'));
  }

  // --------------------
  // Public Methods
  // --------------------

  async createPayment(dto: any, idempotencyKey: string) {
    if (!idempotencyKey) throw new BadRequestException('Missing idempotency key');

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existing) return existing;

    const payment = await this.prisma.payment.create({
      data: {
        ...dto,
        status: 'PENDING',
        idempotencyKey,
      },
    });

    return payment;
  }

  async getPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new BadRequestException('Payment not found');
    return payment;
  }

  async handleWebhook(body: any) {
    this.logger.info('Webhook received', { body });
    return { received: true };
  }

  async processPayment(paymentId: string) {
    const lockKey = `payment-lock:${paymentId}`;
    const acquired = await this.redisLock.acquireLock(lockKey, 10000);

    if (!acquired) {
      this.logger.warn('Payment already processing', { paymentId });
      return;
    }

    try {
      const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new BadRequestException('Payment not found');

      await this.logEvent(paymentId, 'PROCESSING', 'Gateway call via circuit breaker');

      const result = await this.breaker.fire(payment);

      await this.logEvent(paymentId, 'SUCCESS', 'Payment completed successfully');

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          externalRef: result.reference,
        },
      });

      return result;
    } catch (error: any) {
      await this.logEvent(paymentId, 'FAILED', error.message);

      if (this.isRetryableError(error)) {
        await this.scheduleRetry(paymentId);
      }

      throw error;
    } finally {
      if (acquired) await this.redisLock.releaseLock(lockKey);
    }
  }

  // --------------------
  // Private Helpers
  // --------------------

  private async mockGatewayCharge(payment: any) {
    return { success: true, reference: `TXN-${Date.now()}` };
  }

  private async logEvent(
    paymentId: string,
    type: 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRY_SCHEDULED',
    message: string,
  ) {
    await this.prisma.paymentEvent.create({
      data: { paymentId, type, message },
    });
  }

  private isRetryableError(error: any) {
    return error.message.includes('network') || error.message.includes('timeout');
  }

  private async scheduleRetry(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    const retryCount = payment?.retryCount ?? 0;
    const delay = 2000 * Math.pow(2, retryCount);

    await this.logEvent(paymentId, 'RETRY_SCHEDULED', `Retry scheduled in ${delay}ms`);

    await this.retryQueue.add('retry-payment', { paymentId }, { delay });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { retryCount: retryCount + 1 },
    });
  }
}