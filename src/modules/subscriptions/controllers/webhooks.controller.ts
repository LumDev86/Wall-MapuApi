import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  BadRequestException,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

import { SubscriptionsService } from '../services/subscriptions.service';
import { MercadoPagoWebhookDto } from '../dtos';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly service: SubscriptionsService) {}

  // -------------------------------------------------------------
  // 🔵 WEBHOOK OFICIAL DE MERCADO PAGO
  // -------------------------------------------------------------
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Webhook de Mercado Pago',
    description: 'Recibe notificaciones de pagos (NO requiere auth)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook procesado correctamente',
  })
  async handleMercadoPago(
    @Body() dto: MercadoPagoWebhookDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('🔔 WEBHOOK RECIBIDO DE MERCADO PAGO');
    this.logger.log(`📌 Request ID: ${requestId}`);
    this.logger.debug(`Payload recibido: ${JSON.stringify(dto)}`);
    this.logger.log('═══════════════════════════════════════════════════════');

    // Validación mínima
    if (!dto.data?.id) {
      this.logger.error('❌ Webhook inválido: falta data.id');
      throw new BadRequestException('Webhook de Mercado Pago inválido (falta data.id)');
    }

    try {
      // Procesar webhook llamando al service
      const result = await this.service.processWebhook(dto.data.id);

      this.logger.log(`✅ Webhook procesado: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error('❌ Error procesando webhook');
      this.logger.error(error.message);

      // IMPORTANTE → Mercado Pago espera SIEMPRE 200
      return {
        message: 'Webhook recibido pero falló el procesamiento interno',
        error: error.message,
      };
    }
  }
}
