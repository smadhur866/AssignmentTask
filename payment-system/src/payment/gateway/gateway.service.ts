import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayService {
    async charge() {
  const random = Math.random();

  await new Promise((resolve) =>
    setTimeout(resolve, 2000),
  );

  if (random < 0.3) {
    throw new Error('timeout');
  }

  if (random < 0.6) {
    return {
      success: false,
      reason: 'bank_declined',
    };
  }

  return {
    success: true,
    reference: `txn_${Date.now()}`,
  };
}}
