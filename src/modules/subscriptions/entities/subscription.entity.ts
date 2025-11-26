import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';

export enum SubscriptionPlan {
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler',
}

export enum SubscriptionStatus {
  PENDING = 'pending', // Esperando pago inicial
  ACTIVE = 'active', // Pago aprobado y activa
  EXPIRED = 'expired', // Venció el periodo
  CANCELLED = 'cancelled', // Cancelada por el usuario
  FAILED = 'failed', // Pago rechazado/fallido (puede reintentar)
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
  })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // Mercado Pago
  @Column({ nullable: true })
  mercadoPagoSubscriptionId: string;

  @Column({ nullable: true })
  mercadoPagoPreapprovalId: string;

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: any;

  @Column({ default: true })
  autoRenew: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextPaymentDate: Date;

  // 🆕 Contador de intentos de pago fallidos
  @Column({ type: 'int', default: 0 })
  failedPaymentAttempts: number;

  // Relación
  @OneToOne(() => Shop, (shop) => shop.subscription)
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Column()
  shopId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}