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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { MercadoPagoService } from '../../../common/services/mercadopago.service';
import { MercadoPagoWebhookDto } from '../dtos';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de Mercado Pago para notificaciones de pago' })
  @ApiResponse({ status: 200, description: 'Notificación procesada' })
  @ApiResponse({ status: 400, description: 'Notificación inválida' })
  async handleMercadoPagoWebhook(
    @Body() webhookData: MercadoPagoWebhookDto,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('🔔 WEBHOOK RECIBIDO DE MERCADO PAGO');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`📋 Request ID: ${requestId}`);
    this.logger.log(`📦 Tipo: ${webhookData.type}`);
    this.logger.log(`🎬 Acción: ${webhookData.action}`);
    this.logger.log(`📄 Data: ${JSON.stringify(webhookData.data, null, 2)}`);

    try {
      // Validar que sea una notificación de pago
      if (webhookData.type !== 'payment') {
        this.logger.log('⏭️ No es una notificación de pago, ignorando...');
        return { message: 'Notificación ignorada' };
      }

      // Validar que tenga data.id
      if (!webhookData.data?.id) {
        this.logger.error('❌ Notificación sin data.id');
        throw new BadRequestException('Notificación inválida: falta data.id');
      }

      const paymentId = webhookData.data.id;
      this.logger.log(`🔍 Obteniendo información del pago: ${paymentId}`);

      // Obtener información completa del pago desde MP
      const paymentInfo =
        await this.mercadoPagoService.processPaymentNotification(paymentId);

      this.logger.log(`💳 Estado del pago: ${paymentInfo.status}`);
      this.logger.log(
        `📝 External Reference: ${paymentInfo.externalReference}`,
      );
      this.logger.log(`🏷️ Metadata: ${JSON.stringify(paymentInfo.metadata)}`);

      // Verificar que sea una suscripción (y no un banner)
      const metadata = paymentInfo.metadata || {};
      if (metadata.type !== 'subscription') {
        this.logger.log('⏭️ No es un pago de suscripción, ignorando...');
        return { message: 'No es una suscripción' };
      }

      // Procesar según el estado del pago
      let result;
      switch (paymentInfo.status) {
        case 'approved':
          this.logger.log('✅ Pago APROBADO - Activando suscripción...');
          result =
            await this.subscriptionsService.processApprovedPayment(paymentInfo);
          this.logger.log(`🎉 Suscripción activada: ${result.id}`);
          break;

        case 'rejected':
        case 'cancelled':
          this.logger.warn('❌ Pago RECHAZADO/CANCELADO');
          result =
            await this.subscriptionsService.processRejectedPayment(paymentInfo);
          break;

        case 'pending':
        case 'in_process':
        case 'in_mediation':
          this.logger.log('⏳ Pago PENDIENTE - No se toma acción aún');
          return {
            message: 'Pago pendiente, esperando confirmación',
            status: paymentInfo.status,
          };

        case 'refunded':
        case 'charged_back':
          this.logger.warn('💸 Pago REEMBOLSADO/CONTRACARGO');
          // TODO: Implementar lógica de reembolso si es necesario
          return {
            message: 'Pago reembolsado',
            status: paymentInfo.status,
          };

        default:
          this.logger.warn(`⚠️ Estado desconocido: ${paymentInfo.status}`);
          return {
            message: 'Estado de pago desconocido',
            status: paymentInfo.status,
          };
      }

      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('✅ WEBHOOK PROCESADO EXITOSAMENTE');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return {
        message: 'Webhook procesado exitosamente',
        subscriptionId: result?.id,
        status: result?.status,
      };
    } catch (error) {
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.error('❌ ERROR AL PROCESAR WEBHOOK');
      this.logger.error(`📛 Error: ${error.message}`);
      this.logger.error(`📚 Stack: ${error.stack}`);
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // No lanzar error para que MP no reintente
      return {
        message: 'Error procesando webhook',
        error: error.message,
      };
    }
  }

  @Post('test-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint de prueba para testear webhooks manualmente' })
  async testWebhook(@Body() testData: any) {
    this.logger.log('🧪 TEST WEBHOOK RECIBIDO');
    this.logger.log(JSON.stringify(testData, null, 2));
    return { message: 'Test webhook recibido', data: testData };
  }
}
