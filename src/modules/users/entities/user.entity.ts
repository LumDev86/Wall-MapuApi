import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Pet } from './pet.entity';

export enum UserRole {
  CLIENT = 'client',
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler',
  ADMIN = 'admin',
}

export enum UserGender {
  FEMALE = 'female',
  MALE = 'male',
  OTHER = 'other',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  // Nuevos campos para perfil de cliente
  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: UserGender,
    nullable: true,
  })
  gender: UserGender;

  @Column({ length: 100, nullable: true })
  barrio: string;

  @Column({ default: false })
  hasDogs: boolean;

  @Column({ default: false })
  hasCats: boolean;

  @Column({ default: false })
  hasOtherPets: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  passwordResetExpires?: Date;

  @Column({ default: true })
  isActive: boolean;

  // Relaciones
  @OneToMany(() => Shop, (shop) => shop.owner)
  shops: Shop[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => Pet, (pet) => pet.user, { cascade: true, eager: true })
  pets: Pet[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
