import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';

export enum UserRole {
  CLIENT = 'client',
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler',
  ADMIN = 'admin',
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

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}