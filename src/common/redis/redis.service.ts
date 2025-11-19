// src/common/redis/redis.service.ts
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
    await this.disconnect();
  }

  private async connect() {
    try {
      const redisConfig = this.configService.get('redis');
      
      this.client = createClient({
        username: redisConfig.username,
        password: redisConfig.password,
        socket: {
          host: redisConfig.socket.host,
          port: redisConfig.socket.port,
        },
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.logger.log('Redis connection established successfully');
      
      // Test connection
      await this.client.ping();
      this.logger.log('Redis ping successful');

    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  private async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  // 🔧 MÉTODOS BÁSICOS
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
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
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  // 🔍 MÉTODOS AVANZADOS PARA PET-SHOPS
  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  // 🗺️ MÉTODOS ESPECÍFICOS PARA LA APP
  async cacheShopsByLocation(
    lat: number,
    lng: number,
    radius: number,
    filters: any,
    data: any,
    ttl: number = 300, // 5 minutos
  ): Promise<void> {
    const key = this.generateLocationKey(lat, lng, radius, filters);
    await this.setJSON(key, { ...data, cachedAt: new Date().toISOString() }, ttl);
  }

  async getShopsByLocation(
    lat: number,
    lng: number,
    radius: number,
    filters: any,
  ): Promise<any> {
    const key = this.generateLocationKey(lat, lng, radius, filters);
    return await this.getJSON(key);
  }

  async cacheProductSearch(
    searchTerm: string,
    filters: any,
    data: any,
    ttl: number = 600, // 10 minutos
  ): Promise<void> {
    const key = this.generateProductSearchKey(searchTerm, filters);
    await this.setJSON(key, { ...data, cachedAt: new Date().toISOString() }, ttl);
  }

  async getProductSearch(searchTerm: string, filters: any): Promise<any> {
    const key = this.generateProductSearchKey(searchTerm, filters);
    return await this.getJSON(key);
  }

  // 🏪 MÉTODOS PARA INVALIDAR CACHE
  async invalidateShopCache(shopId: string): Promise<void> {
    await this.deleteKeysByPattern('shops:location:*');
    await this.del(`shop:${shopId}`);
  }

  async invalidateProductCache(productId: string): Promise<void> {
    await this.del(`product:${productId}`);
    await this.deleteKeysByPattern('products:search:*');
  }

  // 🔑 GENERADORES DE KEYS
  private generateLocationKey(lat: number, lng: number, radius: number, filters: any): string {
    const filterHash = this.hashObject(filters);
    return `shops:location:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}:${filterHash}`;
  }

  private generateProductSearchKey(searchTerm: string, filters: any): string {
    const filterHash = this.hashObject(filters);
    return `products:search:${searchTerm}:${filterHash}`;
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // 🗑️ CAMBIAR DE PRIVATE A PUBLIC
  public async deleteKeysByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      // Usamos SCAN para evitar bloqueos en producción
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting keys by pattern ${pattern}:`, error);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
  }

  // 📊 MÉTODOS DE MONITORING
  async getStats(): Promise<any> {
    if (!this.isConnected) return null;
    
    try {
      const info = await this.client.info();
      
      return {
        connected: this.isConnected,
        info: info.split('\r\n').slice(0, 10), // Primeras 10 líneas
      };
    } catch (error) {
      this.logger.error('Error getting Redis stats:', error);
      return null;
    }
  }

  // 🔄 MÉTODOS DE BULK OPERATIONS
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.isConnected) return keys.map(() => null);
    try {
      return await this.client.mGet(keys);
    } catch (error) {
      this.logger.error('Error in mget:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValues: [string, string][]): Promise<void> {
    if (!this.isConnected) return;
    try {
      const flatArray = keyValues.flat();
      await this.client.mSet(flatArray);
    } catch (error) {
      this.logger.error('Error in mset:', error);
    }
  }
}