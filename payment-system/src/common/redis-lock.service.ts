import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  /**
   * Acquire a lock with a timeout
   * @param key unique key for the lock
   * @param ttl lock expiration in ms
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(key: string, ttl: number = 10000): Promise<boolean> {
    const result = await this.redis.set(key, 'locked', 'PX', ttl, 'NX');
    const acquired = result === 'OK';
    if (!acquired) {
      this.logger.warn(`Lock for ${key} is already acquired.`);
    }
    return acquired;
  }

  /**
   * Release a lock
   */
  async releaseLock(key: string) {
    await this.redis.del(key);
  }
}