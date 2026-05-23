import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { getQueueToken } from '@nestjs/bullmq';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPrisma = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisLock = {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: 'RedisLockService', useValue: mockRedisLock },
        {
          provide: getQueueToken('payment-retry'),
          useValue: mockQueue,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});