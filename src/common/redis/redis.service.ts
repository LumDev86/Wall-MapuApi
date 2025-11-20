// src/common/redis/redis.service.ts - VERSIÓN SIMPLIFICADA
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }

  private async connect() {
    try {
      const redisConfig = this.configService.get('redis');
      
      if (!redisConfig?.socket?.host) {
        this.logger.warn('Redis config not found, skipping connection');
        return;
      }

      this.client = createClient({
        username: redisConfig.username,
        password: redisConfig.password,
        socket: {
          host: redisConfig.socket.host,
          port: redisConfig.socket.port,
        },
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Redis connected successfully');
      
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
      this.isConnected = false;
    }
  }

  // 🔧 MÉTODOS BÁSICOS SIMPLIFICADOS
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      // Silently fail in production
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      // Silently fail
    }
  }

  // 🔍 MÉTODOS JSON
  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  // 🗑️ MÉTODO SIMPLIFICADO - SIN SCAN
  public async deleteKeysByPattern(pattern: string): Promise<void> {
    // En producción, no hacemos nada complejo
    // Los keys expirarán por TTL automáticamente
    this.logger.log(`Cache invalidation requested for pattern: ${pattern}`);
  }
}