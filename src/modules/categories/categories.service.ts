import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { parentId, ...data } = createCategoryDto;

    // Si tiene parent, verificar que exista
    if (parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Categoría padre no encontrada');
      }

      // Verificar que el parent no sea una subcategoría (máximo 2 niveles)
      if (parent.parentId) {
        throw new BadRequestException(
          'No se pueden crear subcategorías de tercer nivel',
        );
      }
    }

    const category = this.categoryRepository.create({
      ...data,
      parentId,
    });

    await this.categoryRepository.save(category);

    return {
      message: 'Categoría creada exitosamente',
      category,
    };
  }

  async findAll() {
    const categories = await this.categoryRepository.find({
      where: { 
        isActive: true, 
        parentId: IsNull()
      },
      relations: ['subcategories'],
      order: { order: 'ASC', name: 'ASC' },
    });

    return {
      total: categories.length,
      categories,
    };
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    const { parentId, ...data } = updateCategoryDto;

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException(
          'Una categoría no puede ser su propia padre',
        );
      }

      if (parentId) {
        const parent = await this.categoryRepository.findOne({
          where: { id: parentId },
        });

        if (!parent) {
          throw new NotFoundException('Categoría padre no encontrada');
        }

        if (parent.parentId) {
          throw new BadRequestException(
            'No se pueden crear subcategorías de tercer nivel',
          );
        }
      }

      category.parentId = parentId;
    }

    Object.assign(category, data);
    await this.categoryRepository.save(category);

    return {
      message: 'Categoría actualizada exitosamente',
      category,
    };
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    // Verificar si tiene subcategorías
    if (category.subcategories && category.subcategories.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    // Soft delete
    category.isActive = false;
    await this.categoryRepository.save(category);

    return {
      message: 'Categoría eliminada exitosamente',
    };
  }
}