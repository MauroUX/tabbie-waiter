// Los escenarios del simulador (design D2): ESC-1, ESC-2 y ESC-5. Cada uno es completo: el comensal entra como
// invitado y se une a la mesa, porque cada corrida es un proceso aparte y no guarda el JWT de la anterior.
import type { Argumentos } from './argumentos';
import { Comensal, enviar, PETICION } from './cliente';
import type { Turno } from './cliente';

/** Lo que una corrida dejó creado: es la línea JSON de stdout. */
export interface Resumen {
  escenario: string;
  restaurantId: string;
  mesa: number;
  tableSessionId: number | null;
  comensales: Array<{ userId: number | null; guestId: string }>;
  orderIds: number[];
  requestId: string | null;
}

const numero = (valor: unknown, campo: string): number => {
  const dato = (valor as Record<string, unknown> | null)?.[campo];
  if (typeof dato !== 'number') {
    throw new Error(`La respuesta de la réplica no trae ${campo} como número`);
  }
  return dato;
};

/** `POST /auth/guest` y `/join`: el comensal queda con su JWT, su userId y la sesión de la mesa. */
async function entrarYUnirse(turno: Turno): Promise<Comensal> {
  const comensal = new Comensal();
  await enviar(
    turno,
    comensal,
    { peticion: PETICION.invitado, metodo: 'POST', ruta: '/auth/guest', cuerpo: { guestId: comensal.guestId }, conJwt: false },
    (cuerpo) => {
      const respuesta = cuerpo as { access_token?: unknown; user?: { id?: unknown } } | null;
      if (typeof respuesta?.access_token !== 'string' || typeof respuesta.user?.id !== 'number') {
        throw new Error('La respuesta de /auth/guest no trae access_token y user.id');
      }
      comensal.jwt = respuesta.access_token;
      // El userId se conoce desde acá, pero la línea de /auth/guest lleva null: se asigna después de anotarla.
      return {};
    },
  ).then((cuerpo) => {
    comensal.userId = (cuerpo as { user: { id: number } }).user.id;
  });

  await enviar(
    turno,
    comensal,
    {
      peticion: PETICION.unirse,
      metodo: 'POST',
      ruta: `/table-sessions/join/restaurant/${turno.restauranteId}/table/${turno.mesa}`,
      cuerpo: { userId: comensal.userId },
      conJwt: false,
    },
    (cuerpo) => ({ tableSessionId: numero(cuerpo, 'id') }),
  );
  return comensal;
}

function resumen(turno: Turno, comensales: Comensal[], orderIds: number[], requestId: string | null): Resumen {
  return {
    escenario: turno.escenario,
    restaurantId: turno.restauranteId,
    mesa: turno.mesa,
    tableSessionId: comensales.find((c) => c.tableSessionId !== null)?.tableSessionId ?? null,
    comensales: comensales.map((c) => ({ userId: c.userId, guestId: c.guestId })),
    orderIds,
    requestId,
  };
}

export async function correrEscenario(argumentos: Argumentos, turno: Turno): Promise<Resumen> {
  if (argumentos.escenario === 'esc-1') {
    const comensales: Comensal[] = [];
    for (let i = 0; i < argumentos.comensales; i += 1) {
      comensales.push(await entrarYUnirse(turno));
    }
    return resumen(turno, comensales, [], null);
  }

  const comensal = await entrarYUnirse(turno);

  if (argumentos.escenario === 'esc-2') {
    const orderIds: number[] = [];
    for (let i = 0; i < argumentos.pedidos; i += 1) {
      const pedido = await enviar(
        turno,
        comensal,
        {
          peticion: PETICION.crearPedido,
          metodo: 'POST',
          ruta: '/orders',
          cuerpo: {
            tableSessionId: comensal.tableSessionId,
            items: argumentos.productos.map(({ productId, quantity }) => ({ productId, quantity })),
          },
          conJwt: true,
        },
        (cuerpo) => ({ orderId: numero(cuerpo, 'id') }),
      );
      const orderId = numero(pedido, 'id');
      await enviar(turno, comensal, {
        peticion: PETICION.confirmarPedido,
        metodo: 'PUT',
        ruta: `/orders/${orderId}/confirm`,
        conJwt: true,
        orderId,
      });
      orderIds.push(orderId);
    }
    return resumen(turno, [comensal], orderIds, null);
  }

  // esc-5: amount = monto + propina, noTipAmount = monto. No manda `prepaid`.
  const amount = argumentos.monto + argumentos.propina;
  const solicitud: Record<string, unknown> = {
    userId: comensal.userId,
    userName: `Invitado ${comensal.guestId.slice(0, 8)}`,
    restaurantId: turno.restauranteId,
    tableNumber: turno.mesa,
    tableSessionId: comensal.tableSessionId,
    amount,
    noTipAmount: argumentos.monto,
    method: argumentos.metodo,
  };
  if (argumentos.pedidosCubiertos.length > 0) {
    solicitud.orderIds = argumentos.pedidosCubiertos;
  }
  if (argumentos.lineasCubiertas.length > 0) {
    solicitud.lineItemIds = argumentos.lineasCubiertas;
  }
  let requestId: string | null = null;
  await enviar(
    turno,
    comensal,
    { peticion: PETICION.pedirCobro, metodo: 'POST', ruta: '/payments/in-person-request', cuerpo: solicitud, conJwt: true, monto: amount },
    (cuerpo) => {
      const id = (cuerpo as { id?: unknown } | null)?.id;
      if (typeof id !== 'string') {
        throw new Error('La respuesta de la réplica no trae el id de la solicitud');
      }
      requestId = id;
      return { requestId: id };
    },
  );
  return resumen(turno, [comensal], [], requestId);
}
