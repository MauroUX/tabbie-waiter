import { ApiProperty } from '@nestjs/swagger';
import { CampoSensible } from '../openapi/campo-sensible';

/** `data` de `order-confirmed-notification` (T16, DP-78): el JSON del pedido va escrito dentro de `body`. */
export class EventoPedidoConfirmado {
  @ApiProperty({
    type: 'string',
    description: 'JSON en string con la forma de CuerpoDePedidoConfirmado.',
  })
  body: string;
}

/** El JSON que va dentro de `EventoPedidoConfirmado.body` (DP-78). */
export class CuerpoDePedidoConfirmado {
  @ApiProperty({ type: 'integer' })
  orderId: number;

  @ApiProperty({ type: 'integer' })
  tableNumber: number;

  @ApiProperty({ type: 'integer' })
  tableSessionId: number;

  @ApiProperty({ type: 'string', format: 'uuid' })
  restaurantId: string;

  @ApiProperty({ type: 'string', format: 'date-time', description: 'ISO 8601 en UTC; sin fracción, como la columna.' })
  confirmedAt: string;
}

/**
 * La solicitud de cobro presencial (DP-79): `data` de `in-person-payment-request`, el cuerpo de la respuesta de
 * `POST /payments/in-person-request` y cada elemento de T06. Se guarda sin validar: admite propiedades adicionales.
 */
export class EventoSolicitudDeCobro {
  @ApiProperty({ type: 'string', description: 'uuid v4 que genera la réplica; las de MercadoPago, mp-<userId>-<sessionId>-<timestamp>.' })
  id: string;

  @ApiProperty({ oneOf: [{ type: 'number' }, { type: 'string' }], description: 'user.id, o un texto como "guest".' })
  userId: number | string;

  @CampoSensible({ type: 'string', description: 'Nombre del comensal: dato personal (DP-84).' })
  userName: string;

  @ApiProperty({ type: 'string' })
  restaurantId: string;

  @ApiProperty({ type: 'number' })
  tableNumber: number;

  @ApiProperty({ type: 'number' })
  tableSessionId: number;

  @ApiProperty({ type: 'number' })
  amount: number;

  @ApiProperty({ type: 'number' })
  noTipAmount: number;

  @ApiProperty({ type: 'string', description: 'Por ejemplo POS, Cash o Mercadopago.' })
  method: string;

  @ApiProperty({ type: 'boolean', required: false })
  prepaid?: boolean;

  @ApiProperty({ type: [Number], required: false })
  orderIds?: number[];

  @ApiProperty({ type: [Number], required: false })
  lineItemIds?: number[];
}
