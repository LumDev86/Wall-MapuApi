import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
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
    description: 'Recibe notificaciones de pagos desde Mercado Pago'
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
    this.logger.log(`Webhook recibido - Request ID: ${requestId}`);
    this.logger.debug(`Body: ${JSON.stringify(body)}`);

    try {
      // Validar firma (opcional pero recomendado en producción)
      // const isValid = this.mercadoPagoService.verifyWebhookSignature(signature, body);
      // if (!isValid) {
      //   throw new BadRequestException('Firma inválida');
      // }

      const { type, action, data } = body;

      // Solo procesar notificaciones de pagos
      if (type === 'payment') {
        const paymentId = data.id;

        this.logger.log(`Procesando pago: ${paymentId} - Acción: ${action}`);

        // Obtener información del pago
        const paymentInfo = await this.mercadoPagoService.processPaymentNotification(paymentId);

        // Solo procesar pagos aprobados
        if (paymentInfo.status === 'approved') {
          this.logger.log(`Pago aprobado: ${paymentId}`);
          
          await this.subscriptionsService.processApprovedPayment({
            id: paymentInfo.id,
            external_reference: paymentInfo.externalReference,
            status: paymentInfo.status,
            status_detail: paymentInfo.statusDetail,
            transaction_amount: paymentInfo.transactionAmount,
            date_approved: paymentInfo.dateApproved,
            payer_email: paymentInfo.payerEmail,
            metadata: paymentInfo.metadata,
          });

          return { message: 'Pago procesado exitosamente' };
        } else {
          this.logger.warn(`Pago no aprobado: ${paymentId} - Estado: ${paymentInfo.status}`);
          return { message: 'Pago recibido pero no aprobado' };
        }
      }

      // Otros tipos de notificaciones
      this.logger.log(`Tipo de notificación no procesada: ${type}`);
      return { message: 'Notificación recibida' };

    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`, error.stack);
      
      // Devolver 200 para que MP no reintente
      return { message: 'Error procesado' };
    }
  }

  @Post('test-webhook')
  @ApiExcludeEndpoint() // Ocultar en producción
  @ApiOperation({ 
    summary: 'Test webhook (solo desarrollo)',
    description: 'Simular un webhook de Mercado Pago para testing'
  })
  async testWebhook(@Body() body: any) {
    this.logger.log('Test webhook ejecutado');
    
    // Simular un pago aprobado
    const testPayment = {
      id: 'test-payment-id',
      external_reference: body.subscriptionId,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 5000,
      date_approved: new Date().toISOString(),
      payer_email: 'test@test.com',
      metadata: {},
    };

    await this.subscriptionsService.processApprovedPayment(testPayment);

    return { 
      message: 'Test webhook procesado',
      payment: testPayment 
    };
  }
}