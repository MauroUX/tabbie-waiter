---
name: datos-iniciales
description: Procedimiento obligatorio para los tickets de Datos (datos iniciales y cuentas de prueba). Usa el ciclo de replica-feature y agrega los controles de Datos contra la base real (uuid, FK llenas, enums, umbrales, precios sin decimales, conteos antes y después, y dos cargas desde cero con la misma foto), y se para en las paradas del humano de credenciales y de servicios externos. Usar siempre en un ticket de Datos, aunque nadie la pida.
---

# Un ticket de Datos, de los criterios al verde

El ciclo es el de `replica-feature` (explorar → plan → OK → tests → rojo → congelar → implementar → verde → huella → cierre), con sus subagentes `test-writer` e `implementer`. Esta skill dice solo lo que cambia. Lo que no dice, lo dice `replica-feature`, incluida su sección "Lo que ya se aprendió haciéndolo".

## Plan: lo que suma a la tabla de piezas

- **Controles de Datos** (DoD de Datos), cada uno con su consulta contra la base real, no contra el código:
  - el uuid de `restaurant.id`, contra la forma 8-4-4-4-12;
  - las FK que aceptan nulos pero se llenan, con un LEFT JOIN al padre;
  - los enums, con `SELECT DISTINCT`;
  - los umbrales, ordenados y en rango;
  - los precios sin decimales: el tipo de la columna y ningún literal con decimales en el SQL, porque MySQL redondea en silencio.
- **Conteos y foto:** el conteo de las 13 tablas antes y después de cargar, y un `mysqldump --no-create-info --order-by-primary --skip-dump-date --skip-comments --skip-extended-insert` de las tablas que carga el SQL. Dos cargas desde cero dan la misma foto, con un control positivo que impide que dos fotos vacías salgan iguales.
- **Claves fijas en el SQL:** con autoincremento libre, la recarga no se compara valor por valor.
- **Cómo se deshace cada carga:** con otra carga, fallando en alto o solo recreando la base.
- **Huecos del modelo de datos:** van como preguntas con una respuesta recomendada, y quedan como DP. No se inventan valores.
- **Credenciales:** de dónde las lee cada pieza (un archivo local ignorado con su `.example` de solo nombres), qué servicios las ven y cómo las bloquea el hook (`valores-prohibidos.local`).

## Lo que recrea la base va en bash, en la máquina

El contenedor de pruebas no puede hacer `down -v`. La recarga, el `up` sobre la base cargada y las fallas en alto van en `replica/tests/datos/*.sh`, con un bloque por scenario y su ID, y como paso de la CI. Solo con el perfil de pruebas. Nunca `docker compose config`, `docker inspect` ni `env`, y la contraseña de MySQL solo dentro del contenedor.

## Paradas del humano

1. **Antes de escribir datos con correos o contraseñas:** el humano llena `.claude/hooks/valores-prohibidos.local`, una contraseña por línea. Se comprueba solo con `test -f`.
2. **El archivo local de contraseñas y las variables nuevas:** se le dan la ruta y los nombres, y los valores los carga él. No se abren ni se listan.
3. **Lo que escribe en un servicio externo** (Firebase): primero el modo que no escribe, mostrando qué crearía y qué ya existe; después, con OK, el que escribe. Si algo ya existe antes de la primera creación, se para y se pregunta.

## Pruebas locales

Las que necesitan el servicio externo se marcan locales (DP-43), y su salida, sin tokens, va en el PR. Si nacen en verde o solo fallan porque faltan variables, su rojo se muestra por mutación de los datos de entrada o del código, comprobando antes que la imagen mutada compiló.

## Lo que ya se aprendió haciéndolo

Se completa al cerrar cada ticket de Datos con lo que costó y no estaba escrito.

**TK-02 (datos iniciales y cuentas de prueba):** el primer ticket de Datos. Se hizo con `replica-feature`, y de ahí sale esta skill; lo aprendido está en esa skill, sección "TK-02".
