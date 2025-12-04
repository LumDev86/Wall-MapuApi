import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum ShopType {
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler',
}

export enum ShopStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({
    type: 'enum',
    enum: ShopType,
  })
  type: ShopType;

  @Column({
    type: 'enum',
    enum: ShopStatus,
    default: ShopStatus.PENDING_PAYMENT,
  })
  status: ShopStatus;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  // Horarios de atención (JSON)
  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  banner: string;

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => User, (user) => user.shops, { eager: true })
  owner: User;

  @OneToMany(() => Product, (product) => product.shop)
  products: Product[];

  @OneToMany(() => Review, (review) => review.shop)
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}