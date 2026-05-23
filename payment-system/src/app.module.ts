import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PaymentModule } from './payment/payment.module';


import { AppController } from './app.controller';
import { AppService } from './app.service';
import { winstonConfig } from './logger/winston.config';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
    }),
    WinstonModule.forRoot(winstonConfig),
          ThrottlerModule.forRoot({
  throttlers: [
    {
      ttl: 60000,   // 60 seconds → now in MILLISECONDS
      limit: 10,
    },
  ],
}),
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}