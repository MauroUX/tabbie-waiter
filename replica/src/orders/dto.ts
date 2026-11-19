import { ApiProperty } from '@nestjs/swagger';
import { OrderProductDetails } from './order-product-details.entity';
import type { EstadoDePedido, TipoDePedido } from './order.entity';

export class OpcionElegidaDto {
  @ApiProperty({ type: 'integer' })
  productOptionId: number;

  @ApiProperty({ type: [Number], description: 'Los ids de los product_option_value elegidos de esa opción.' })
  valueIds: number[];
}

export class ItemDePedidoDto {
  @ApiProperty({ type: 'integer' })
  productId: number;

  @ApiProperty({ type: 'integer', minimum: 1 })
  quantity: number;

  @ApiProperty({ type: 'string', required: false })
  note?: string;

  @ApiProperty({ type: () => [OpcionElegidaDto], required: false })
  selectedOptions?: OpcionElegidaDto[];
}

export class CrearPedidoDto {
  @ApiProperty({ type: 'integer' })
  tableSessionId: number;

  @ApiProperty({ type: () => [ItemDePedidoDto] })
  items: ItemDePedidoDto[];
}

/** El pedido de `POST /orders` y de `confirm` (DP-75, DP-76): sus columnas e `items[]` con el árbol, sin `user`. */
export class PedidoDeRespuesta {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty({ type: 'integer', nullable: true })
  userId: number | null;

  @ApiProperty({ type: 'string', format: 'uuid', nullable: true })
  restaurantId: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  tableSessionId: number | null;

  @ApiProperty({ type: () => [OrderProductDetails] })
  items: OrderProductDetails[];

  @ApiProperty({ enum: ['appetizer', 'main_course', 'dessert'] })
  type: TipoDePedido;

  @ApiProperty({ enum: ['pending', 'confirmed', 'in_kitchen', 'canceled'] })
  status: EstadoDePedido;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'ISO 8601 en UTC con milisegundos; el datetime no guarda fracción, así que termina en .000Z.',
  })
  confirmedAt: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  sentToKitchenAt: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  canceledAt: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  cancellationReason: string | null;

  @ApiProperty({ type: 'boolean' })
  isPaid: boolean;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  paidAt: Date | null;
}

