import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MercadoPagoWebhookDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  api_version?: string;

  @IsOptional()
  data?: {
    id: string;
  };

  @IsOptional()
  @IsNumber()
  date_created?: number;

  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  live_mode?: boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}
