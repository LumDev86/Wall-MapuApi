// src/config/redis.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || 'CKdtycko5v8ODr8DiC4xtVv244Fd8yTX',
  socket: {
    host: process.env.REDIS_HOST || 'redis-17075.c89.us-east-1-3.ec2.cloud.redislabs.com',
    port: parseInt(process.env.REDIS_PORT || '17075', 10),
  },
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hora
}));