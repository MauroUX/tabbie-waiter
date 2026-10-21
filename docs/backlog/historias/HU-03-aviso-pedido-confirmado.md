# HU-03. Enterarme de cada pedido confirmado

| | |
|---|---|
| **Épica** | E2. Vista del salón en tiempo real |
| **Prioridad** | Must |
| **RF que cubre** | RF-10, RF-11, RF-12 |
| **RNF y reglas que la condicionan** | RNF-1, RNF-4, RNF-7, RNF-10 |
| **Complejidad** | S: depende de los avisos en tiempo real, pero el canal y la reconexión vienen del walking skeleton. La historia solo muestra el aviso y actualiza la mesa. |

## Historia

**Como** mozo,
**quiero** recibir un aviso con el número de mesa cada vez que un comensal confirma un pedido,
**para** que ningún pedido quede esperando sin que me entere.

## Camino feliz

_Lo escribe el humano._

## Criterios de aceptación

_Pendiente._

## INVEST

| Criterio | | Nota |
|---|---|---|
| Independiente | ✘ | Actualiza la mesa que muestra HU-02, así que va después de ella. |
| Negociable | ✔ | La forma y la duración del aviso se pueden ajustar. |
| Valiosa | ✔ | El mozo se entera al instante de cada pedido nuevo. |
| Estimable | ✔ | El canal de avisos lo deja el walking skeleton. |
| Pequeña | ✔ | Tres RF sobre un único tipo de aviso. |
| Testeable | ✔ | El simulador confirma pedidos y se mide el tiempo de RNF-1. El aviso ilegible se prueba con un aviso inválido. |

## Estimación

_Pendiente._
