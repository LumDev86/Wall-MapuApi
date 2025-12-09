import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'petshops',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(new BadRequestException(`Error al subir imagen: ${error.message}`));
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'petshops',
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  async deleteMultipleImages(publicIds: string[]): Promise<any> {
    return cloudinary.api.delete_resources(publicIds);
  }

  extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${publicId}`;
  }

  async uploadBase64Image(
    base64String: string,
    folder: string = 'petshops',
  ): Promise<UploadApiResponse> {
    try {
      console.log('🔄 Subiendo imagen base64 a Cloudinary...');
      console.log('📏 Tamaño de string base64:', base64String.length);
      console.log('📂 Folder:', folder);
      console.log('🔍 Primeros 50 caracteres:', base64String.substring(0, 50));

      const result = await cloudinary.uploader.upload(base64String, {
        folder,
        resource_type: 'auto',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      console.log('✅ Imagen subida exitosamente:', result.secure_url);
      return result;
    } catch (error) {
      console.error('❌ Error completo en Cloudinary:', error);
      const errorMessage = error?.message || error?.error?.message || JSON.stringify(error);
      throw new BadRequestException(`Error al subir imagen base64: ${errorMessage}`);
    }
  }

  async uploadMultipleBase64Images(
    base64Strings: string[],
    folder: string = 'petshops',
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = base64Strings.map((base64) => this.uploadBase64Image(base64, folder));
    return Promise.all(uploadPromises);
  }
}
