import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/** Un evento del stream de mozos: `type` es el nombre del evento SSE y `data`, su carga. */
export interface EventoDeMozos {
  type: string;
  data: unknown;
}

/**
 * Un `Subject` de RxJS por restaurante, en la memoria del proceso (contexto, sección 5; 0008).
 * Todo evento llega a todos los suscriptores del restaurante. Sin heartbeat ni replay: un evento emitido
 * sin suscriptores, o durante una desconexión, se pierde.
 */
@Injectable()
export class SseService {
  private readonly sujetos = new Map<string, Subject<EventoDeMozos>>();

  /** El stream de un restaurante. Lo usa `GET /sse/waiters`. */
  obtenerStream(restauranteId: string): Observable<EventoDeMozos> {
    return this.sujetoDe(restauranteId).asObservable();
  }

  /** Emite un evento a los mozos conectados del restaurante. Lo usarán TK-03 y TK-13. */
  emitir(restauranteId: string, evento: EventoDeMozos): void {
    this.sujetoDe(restauranteId).next(evento);
  }

  private sujetoDe(restauranteId: string): Subject<EventoDeMozos> {
    let sujeto = this.sujetos.get(restauranteId);
    if (sujeto === undefined) {
      sujeto = new Subject<EventoDeMozos>();
      this.sujetos.set(restauranteId, sujeto);
    }
    return sujeto;
  }
}
