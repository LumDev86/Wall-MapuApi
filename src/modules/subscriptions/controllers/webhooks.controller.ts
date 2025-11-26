import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { MercadoPagoService } from '../services/mercadopago.service';

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
  @ApiOperation({ 
    summary: 'Webhook de Mercado Pago',
    description: 'Recibe notificaciones de pagos desde Mercado Pago (aprobados, rechazados, fallidos)'
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado correctamente',
  })
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    this.logger.log(`📨 Webhook recibido - Request ID: ${requestId}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);

    try {
      // Validar firma (opcional pero recomendado en producción)
      // const isValid = this.mercadoPagoService.verifyWebhookSignature(signature, body);
      // if (!isValid) {
      //   this.logger.error('❌ Firma inválida');
      //   return { message: 'Firma inválida' };
      // }

      const { type, action, data } = body;

      // Solo procesar notificaciones de pagos
      if (type === 'payment') {
        const paymentId = data.id;

        this.logger.log(`💳 Procesando pago: ${paymentId} - Acción: ${action}`);

        // Obtener información del pago desde Mercado Pago
        const paymentInfo = await this.mercadoPagoService.processPaymentNotification(paymentId);

        const paymentData = {
          id: paymentInfo.id,
          external_reference: paymentInfo.externalReference,
          status: paymentInfo.status,
          status_detail: paymentInfo.statusDetail,
          transaction_amount: paymentInfo.transactionAmount,
          date_approved: paymentInfo.dateApproved,
          payer_email: paymentInfo.payerEmail,
          metadata: paymentInfo.metadata,
        };

        // 🟢 Pago aprobado
        if (paymentInfo.status === 'approved') {
          this.logger.log(`✅ Pago aprobado: ${paymentId}`);
          
          await this.subscriptionsService.processApprovedPayment(paymentData);

          return { message: 'Pago aprobado procesado exitosamente' };
        }

        // 🔴 Pago rechazado
        if (paymentInfo.status === 'rejected') {
          this.logger.warn(`❌ Pago rechazado: ${paymentId} - Detalle: ${paymentInfo.statusDetail}`);
          
          await this.subscriptionsService.processRejectedPayment(paymentData);

          return { message: 'Pago rechazado registrado' };
        }

        // 🟡 Pago pendiente
        if (paymentInfo.status === 'pending') {
          this.logger.log(`⏳ Pago pendiente: ${paymentId}`);
          return { message: 'Pago pendiente - esperando confirmación' };
        }

        // 🟠 Pago cancelado o fallido
        if (paymentInfo.status === 'cancelled' || paymentInfo.status === 'refunded') {
          this.logger.warn(`⚠️ Pago cancelado/reembolsado: ${paymentId}`);
          
          await this.subscriptionsService.processFailedPayment(paymentData);

          return { message: 'Pago cancelado registrado' };
        }

        // Otros estados
        this.logger.warn(`⚠️ Estado de pago no manejado: ${paymentInfo.status}`);
        return { message: `Estado ${paymentInfo.status} recibido` };
      }

      // Otros tipos de notificaciones
      this.logger.log(`📦 Tipo de notificación no procesada: ${type}`);
      return { message: 'Notificación recibida' };

    } catch (error) {
      this.logger.error(`❌ Error procesando webhook: ${error.message}`, error.stack);
      
      // ⚠️ IMPORTANTE: Devolver 200 para que MP no reintente infinitamente
      // MP reintenta webhooks que devuelven error, pero queremos registrar el fallo
      return { message: 'Error procesado', error: error.message };
    }
  }

  @Post('test-webhook')
  @ApiExcludeEndpoint() // Ocultar en producción
  @ApiOperation({ 
    summary: 'Test webhook (solo desarrollo)',
    description: 'Simular un webhook de Mercado Pago para testing'
  })
  async testWebhook(@Body() body: any) {
    this.logger.log('🧪 Test webhook ejecutado');
    
    const { subscriptionId, status = 'approved' } = body;

    if (!subscriptionId) {
      return { 
        error: 'subscriptionId es requerido',
        example: { subscriptionId: 'uuid-here', status: 'approved' }
      };
    }

    // Simular diferentes tipos de pagos
    const testPayments = {
      approved: {
        id: `test-payment-${Date.now()}`,
        external_reference: subscriptionId,
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 5000,
        date_approved: new Date().toISOString(),
        payer_email: 'test@test.com',
        metadata: {},
      },
      rejected: {
        id: `test-payment-${Date.now()}`,
        external_reference: subscriptionId,
        status: 'rejected',
        status_detail: 'cc_rejected_insufficient_amount',
        transaction_amount: 5000,
        payer_email: 'test@test.com',
        metadata: {},
      },
      failed: {
        id: `test-payment-${Date.now()}`,
        external_reference: subscriptionId,
        status: 'cancelled',
        status_detail: 'by_payer',
        transaction_amount: 5000,
        payer_email: 'test@test.com',
        metadata: {},
      },
    };

    const testPayment = testPayments[status] || testPayments.approved;

    // Procesar según el estado
    if (status === 'approved') {
      await this.subscriptionsService.processApprovedPayment(testPayment);
    } else if (status === 'rejected') {
      await this.subscriptionsService.processRejectedPayment(testPayment);
    } else if (status === 'failed') {
      await this.subscriptionsService.processFailedPayment(testPayment);
    }

    return { 
      message: `Test webhook ${status} procesado`,
      payment: testPayment 
    };
  }
}