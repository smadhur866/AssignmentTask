import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { Throttle } from '@nestjs/throttler';

import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })

  @ApiOperation({
    summary: 'Create a payment',
  })

  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'Unique key for duplicate prevention',
  })

  @ApiBody({
    type: CreatePaymentDto,
  })

  createPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') key: string,
  ) {
    return this.paymentService.createPayment(dto, key);
  }

  @Get(':id')

  @ApiOperation({
    summary: 'Get payment by ID',
  })

  @ApiParam({
    name: 'id',
    example: 'payment-uuid',
  })

  getPayment(@Param('id') id: string) {
    return this.paymentService.getPayment(id);
  }

  @Post('webhook')

  @ApiOperation({
    summary: 'Receive payment webhook',
  })

  handleWebhook(@Body() body: any) {
    return this.paymentService.handleWebhook(body);
  }
}