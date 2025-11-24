import { PartialType } from '@nestjs/swagger';
import { CreateCategoryMultipartDto } from './create-category-multipart.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryMultipartDto) {}
