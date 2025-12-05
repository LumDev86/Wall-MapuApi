import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../entities/category.entity';

// DTO simplificado para Category padre/hija en respuestas
export class CategoryBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty()
  order: number;

  static fromEntity(category: Category): CategoryBasicDto {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon || undefined,
      order: category.order,
    };
  }
}

// DTO de respuesta para Category individual
export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: () => CategoryBasicDto, required: false })
  parent?: CategoryBasicDto;

  @ApiProperty({ type: [CategoryBasicDto], required: false })
  subcategories?: CategoryBasicDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(category: Category, includeRelations = true): CategoryResponseDto {
    const dto: CategoryResponseDto = {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon || undefined,
      order: category.order,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    if (includeRelations) {
      if (category.parent) {
        dto.parent = CategoryBasicDto.fromEntity(category.parent);
      }
      if (category.subcategories && category.subcategories.length > 0) {
        dto.subcategories = category.subcategories
          .filter(sub => sub.isActive)
          .map(sub => CategoryBasicDto.fromEntity(sub));
      }
    }

    return dto;
  }
}

// DTO de respuesta para lista de categorías
export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories: CategoryResponseDto[];

  @ApiProperty()
  total: number;
}
