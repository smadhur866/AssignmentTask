import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Processor('payment-retry')
@Injectable()
export class RetryProcessor {
  constructor(private readonly paymentService: PaymentService) {}

  async retryPayment(job: Job) {
    const { paymentId } = job.data;
    await this.paymentService.processPayment(paymentId);
  }
}