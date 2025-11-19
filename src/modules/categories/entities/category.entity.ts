import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  icon: string | null;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  // Categoría padre (para subcategorías)
  @ManyToOne(() => Category, (category) => category.subcategories, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  parent: Category;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @OneToMany(() => Category, (category) => category.parent)
  subcategories: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}