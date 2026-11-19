import { ApiProperty } from '@nestjs/swagger';
import { CampoSensible } from '../openapi/campo-sensible';

/**
 * El cuerpo de entrada de `POST /payments/in-person-request` (DP-86): sin `id` (lo genera la réplica) y con
 * `restaurantId` como único campo obligatorio. Se guarda sin validar: admite propiedades adicionales. También
 * se acepta la solicitud envuelta: {"body": "<JSON de un objeto>"}.
 */
export class SolicitudDeCobroEntrada {
  @ApiProperty({ type: 'string', description: 'El restaurante de la solicitud: sin él no hay clave en Redis.' })
  restaurantId: string;

  @ApiProperty({ oneOf: [{ type: 'number' }, { type: 'string' }], required: false, description: 'user.id, o un texto como "guest".' })
  userId?: number | string;

  @CampoSensible({ type: 'string', required: false, description: 'Nombre del comensal: dato personal (DP-84).' })
  userName?: string;

  @ApiProperty({ type: 'number', required: false })
  tableNumber?: number;

  @ApiProperty({ type: 'number', required: false })
  tableSessionId?: number;

  @ApiProperty({ type: 'number', required: false })
  amount?: number;

  @ApiProperty({ type: 'number', required: false })
  noTipAmount?: number;

  @ApiProperty({ type: 'string', required: false, description: 'Por ejemplo POS, Cash o Mercadopago.' })
  method?: string;

  @ApiProperty({ type: 'boolean', required: false })
  prepaid?: boolean;

  @ApiProperty({ type: [Number], required: false })
  orderIds?: number[];

  @ApiProperty({ type: [Number], required: false })
  lineItemIds?: number[];

  @ApiProperty({
    type: 'string',
    required: false,
    description: 'Envoltorio: el JSON de la solicitud escrito en un string. Si no es el JSON de un objeto, se guarda tal cual.',
  })
  body?: string;
}
