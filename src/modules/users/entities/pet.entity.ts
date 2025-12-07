import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PetType {
  DOG = 'dog',
  CAT = 'cat',
  OTHER = 'other',
}

@Entity('user_pets')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.pets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: PetType,
  })
  type: PetType;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  breed: string;

  @Column({ length: 50, nullable: true })
  age: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
