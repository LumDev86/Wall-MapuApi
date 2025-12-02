import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BannerStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAYMENT_FAILED = 'payment_failed',
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: BannerStatus,
    default: BannerStatus.PENDING_PAYMENT,
  })
  status: BannerStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // Referencia al pago de Mercado Pago
  @Column({ nullable: true })
  mercadoPagoPaymentId: string;

  @Column({ nullable: true })
  mercadoPagoPreferenceId: string;

  // Contador de intentos de pago
  @Column({ type: 'int', default: 0 })
  paymentAttempts: number;

  // Fecha de pago aprobado
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  // Relación con el usuario dueño del banner
  @ManyToOne(() => User, (user) => user.id, { eager: true })
  @JoinColumn({ name: 'userId' })
  owner: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
