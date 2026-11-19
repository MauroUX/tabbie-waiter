// Change tk-03-simulador-mesas-pedidos-y-cobros · spec contrato-replica · requirement
// "Contrato POST /payments/in-person-request y el evento T17".
// Scenarios: "Una solicitud con un campo body que no es JSON se guarda tal cual" y
// "El OpenAPI declara el cuerpo de entrada y marca los nombres".
// Decisiones: DP-86 (se desenvuelve {body: "<JSON>"} solo si body es el JSON de un objeto; el cuerpo de entrada tiene
// su propio esquema, sin id y con restaurantId como único obligatorio), DP-84 (userName y el name del usuario llevan
// x-sensitive: true), DP-79 (id uuid v4 de la réplica). Las claves de Redis de la prueba se borran al final.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { abrirConexion, Sembrado } from '../apoyo/base';
import type { Conexion } from '../apoyo/base';
import { exigirEstado, exigirOpenApi, FORMA_DE_UUID_V4, Invitados } from '../apoyo/comensal';
import type { Registro } from '../apoyo/comensal';
import { urlReplica } from '../apoyo/entorno';
import { borrarLoQueCreoLaReplica } from '../apoyo/limpieza';
import { cargarOpenApi, marcasSensibles } from '../apoyo/openapi';
import { borrarSolicitudesDe, claveDeSolicitud, conectarRedis } from '../apoyo/redis';
import type { ClienteRedis } from '../apoyo/redis';

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Sigue un `$ref` local (`#/components/...`) hasta el esquema; si no es un `$ref`, lo devuelve tal cual. */
function resolver(documento: Objeto, esquema: unknown): unknown {
  let actual = esquema;
  for (let saltos = 0; saltos < 10 && esObjeto(actual) && typeof actual.$ref === 'string'; saltos += 1) {
    let destino: unknown = documento;
    for (const parte of actual.$ref.replace(/^#\//, '').split('/')) {
      destino = esObjeto(destino) ? destino[parte.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined;
    }
    actual = destino;
  }
  return actual;
}

/**
 * La marca `x-sensitive` del `name` de cada esquema de usuario: los `properties` que tienen `email` y `name`
 * (User, UsuarioDeLogin y los usuarios en línea). Los `name` de restaurante, producto u opción no son de un usuario.
 */
function marcasDelNameDeUsuario(documento: Objeto): boolean[] {
  const marcas: boolean[] = [];
  const recorrer = (valor: unknown): void => {
    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
      return;
    }
    if (!esObjeto(valor)) {
      return;
    }
    for (const [clave, interno] of Object.entries(valor)) {
      if (clave === 'properties' && esObjeto(interno) && 'email' in interno && 'name' in interno) {
        const name = interno.name;
        marcas.push(esObjeto(name) && name['x-sensitive'] === true);
      }
      recorrer(interno);
    }
  };
  recorrer(documento);
  return marcas;
}

describe('in-person-request · body que no es JSON', () => {
  let conexion: Conexion | undefined;
  let sembrado: Sembrado | undefined;
  let redis: ClienteRedis | undefined;
  const invitados = new Invitados();
  const restauranteId = randomUUID();

  beforeAll(async () => {
    conexion = await abrirConexion();
    redis = await conectarRedis();
    sembrado = new Sembrado(conexion);
    await sembrado.insertar('restaurant', { id: restauranteId, name: 'Restaurante Body No JSON de Prueba' });
  });

  afterAll(async () => {
    if (redis) {
      await borrarSolicitudesDe(redis, [restauranteId]);
      redis.disconnect();
    }
    if (conexion) {
      await borrarLoQueCreoLaReplica(conexion, { restaurantes: [restauranteId], emailsDeInvitados: invitados.emails });
    }
    await sembrado?.deshacer();
    await conexion?.end();
  });

  test('Una solicitud con un campo body que no es JSON se guarda tal cual', async () => {
    const cliente = redis as ClienteRedis;
    const invitado = await invitados.entrar();

    // Una solicitud completa con además body: "nota". tableSessionId es un dato sin validar, no un id que se busque.
    const enviada = {
      userId: invitado.userId,
      userName: 'Invitado Con Nota de Prueba',
      restaurantId: restauranteId,
      tableNumber: 5,
      tableSessionId: 0,
      amount: 2500,
      noTipAmount: 2500,
      method: 'POS',
      body: 'nota',
    };
    const respuesta = await request(urlReplica())
      .post('/payments/in-person-request')
      .set('Authorization', `Bearer ${invitado.jwt}`)
      .send(enviada);

    // 201, con el id que generó la réplica (DP-79).
    exigirEstado('POST /payments/in-person-request con body "nota"', respuesta, 201);
    exigirOpenApi({ ruta: '/payments/in-person-request', metodo: 'post', codigo: 201 }, respuesta.body);
    const id = String((respuesta.body as Registro).id);
    expect(id).toMatch(FORMA_DE_UUID_V4);

    // En Redis, la solicitud tal como llegó, con body: "nota" y ese id.
    const valor = await cliente.get(claveDeSolicitud(restauranteId, id));
    expect(valor === null ? null : (JSON.parse(valor) as unknown)).toEqual({ ...enviada, id });
  });
});

describe('in-person-request · el OpenAPI', () => {
  test('El OpenAPI declara el cuerpo de entrada y marca los nombres', () => {
    const documento = cargarOpenApi();

    // El requestBody de POST /payments/in-person-request: un esquema sin id, con restaurantId como único obligatorio.
    const paths = documento.paths as Objeto | undefined;
    const ruta = paths?.['/payments/in-person-request'];
    const operacion = esObjeto(ruta) ? ruta.post : undefined;
    const cuerpo = esObjeto(operacion) ? resolver(documento, operacion.requestBody) : undefined;
    const contenido = esObjeto(cuerpo) && esObjeto(cuerpo.content) ? cuerpo.content['application/json'] : undefined;
    const esquema = esObjeto(contenido) ? resolver(documento, contenido.schema) : undefined;
    expect(esObjeto(esquema)).toBe(true);
    const entrada = esquema as Objeto;
    expect(esObjeto(entrada.properties)).toBe(true);
    const propiedades = Object.keys(entrada.properties as Objeto);
    expect({ id: propiedades.includes('id'), restaurantId: propiedades.includes('restaurantId') }).toEqual({
      id: false,
      restaurantId: true,
    });
    expect(entrada.required).toEqual(['restaurantId']);

    // userName lleva x-sensitive: true en todos los esquemas donde aparece (DP-84).
    const deUserName = marcasSensibles(['userName']).get('userName') ?? [];
    expect({ nombre: 'userName', apariciones: deUserName.length > 0 }).toEqual({ nombre: 'userName', apariciones: true });
    expect({ nombre: 'userName', marcas: deUserName }).toEqual({ nombre: 'userName', marcas: deUserName.map(() => true) });

    // El name del usuario también, en todos los esquemas de usuario (DP-84).
    const deName = marcasDelNameDeUsuario(documento);
    expect({ nombre: 'name del usuario', apariciones: deName.length > 0 }).toEqual({
      nombre: 'name del usuario',
      apariciones: true,
    });
    expect({ nombre: 'name del usuario', marcas: deName }).toEqual({
      nombre: 'name del usuario',
      marcas: deName.map(() => true),
    });
  });
});
