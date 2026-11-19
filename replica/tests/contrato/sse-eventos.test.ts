// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement (MODIFIED)
// "Contrato del stream GET /sse/waiters". Scenario: "Los esquemas de T16 y T17 están en el OpenAPI".
// Los otros tres scenarios del requirement tienen su prueba en sse-waiters.test.ts (TK-01), sin cambios.
// Decisiones: DP-78 (payload de T16), DP-79 (la solicitud de T17), design.md D6 (los esquemas en components.schemas).
import { cargarOpenApi } from '../apoyo/openapi';
import { esquemaDeComponente } from '../apoyo/esquemas';

type Objeto = Record<string, unknown>;

const propiedades = (esquema: Objeto | undefined): Objeto => (esquema?.properties ?? {}) as Objeto;

describe('Stream · esquemas de los eventos en el OpenAPI', () => {
  test('Los esquemas de T16 y T17 están en el OpenAPI', () => {
    // order-confirmed-notification: {body: string} y el esquema de su JSON de adentro.
    const eventoPedido = esquemaDeComponente('EventoPedidoConfirmado');
    expect({ esquema: 'EventoPedidoConfirmado', existe: eventoPedido !== undefined }).toEqual({
      esquema: 'EventoPedidoConfirmado',
      existe: true,
    });
    expect((propiedades(eventoPedido).body as Objeto | undefined)?.type).toBe('string');

    const cuerpoPedido = esquemaDeComponente('CuerpoDePedidoConfirmado');
    expect({ esquema: 'CuerpoDePedidoConfirmado', existe: cuerpoPedido !== undefined }).toEqual({
      esquema: 'CuerpoDePedidoConfirmado',
      existe: true,
    });
    expect(Object.keys(propiedades(cuerpoPedido)).sort()).toEqual(
      ['confirmedAt', 'orderId', 'restaurantId', 'tableNumber', 'tableSessionId'].sort(),
    );

    // in-person-payment-request: la solicitud de cobro.
    const solicitud = esquemaDeComponente('EventoSolicitudDeCobro');
    expect({ esquema: 'EventoSolicitudDeCobro', existe: solicitud !== undefined }).toEqual({
      esquema: 'EventoSolicitudDeCobro',
      existe: true,
    });
    const camposDeLaSolicitud = Object.keys(propiedades(solicitud));
    for (const campo of [
      'id',
      'userId',
      'userName',
      'restaurantId',
      'tableNumber',
      'tableSessionId',
      'amount',
      'noTipAmount',
      'method',
    ]) {
      expect({ campo, presente: camposDeLaSolicitud.includes(campo) }).toEqual({ campo, presente: true });
    }

    // La descripción de GET /sse/waiters nombra los dos eventos.
    const rutas = cargarOpenApi().paths as Objeto;
    const descripcion = String(((rutas['/sse/waiters'] as Objeto).get as Objeto).description ?? '');
    expect(descripcion).toContain('order-confirmed-notification');
    expect(descripcion).toContain('in-person-payment-request');
  });
});
