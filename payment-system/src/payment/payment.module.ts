// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module'; // <- correct relative path
import { RedisLockService } from '../common/redis-lock.service';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'payment-retry' }),
    WinstonModule, // if you want logger injection
  ],
  controllers: [PaymentController],
  providers: [PaymentService, RedisLockService],
})
export class PaymentModule {} // <- this must match the import in AppModule