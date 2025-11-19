import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    icon?: Express.Multer.File,
  ) {
    const { parentId, ...data } = createCategoryDto;

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

    let iconUrl: string | null = null;

    if (icon) {
      const upload = await this.cloudinaryService.uploadImage(icon, 'categories');
      iconUrl = upload.secure_url;
    }


    const category = this.categoryRepository.create({
      ...data,
      parentId,
      icon: iconUrl ?? data.icon,
    });

    await this.categoryRepository.save(category);

    return {
      message: 'Categoría creada exitosamente',
      category,
    };
  }

  async findAll() {
    const categories = await this.categoryRepository.find({
      where: { isActive: true, parentId: IsNull() },
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

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    icon?: Express.Multer.File,
  ) {
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

    if (icon) {
      const upload = await this.cloudinaryService.uploadImage(icon, 'categories');
      category.icon = upload.secure_url;
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

    if (category.subcategories && category.subcategories.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    category.isActive = false;
    await this.categoryRepository.save(category);

    return {
      message: 'Categoría eliminada exitosamente',
    };
  }
}
