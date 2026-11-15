# 0009 · Publicación del repo y credenciales de prueba

## Contexto

- El repo es público, porque es la entrega del máster.
- 0002 decide que las cuentas de prueba existen en el proyecto de Firebase de Tabbie y que sus credenciales se documentan en el `Readme.md`. Con eso, cualquiera que lea el `Readme.md` puede iniciar sesión con ellas en ese proyecto (RA-7 de [seguridad.md](../architecture/seguridad.md)).
- La réplica es una copia del código de `order-pay-backend` y expone los huecos O1 a O4 (contexto, sección 7).
- El evaluador necesita entrar a la app sin preparar nada (backlog, "Comportamientos entre tablets").

## Decisión

- **El repo sigue público** hasta la entrega final, en diciembre de 2026 (DP-01).
- **El dueño de Tabbie autoriza** publicar los huecos del backend (O1 a O4) y copiar su código en `backend/` (DP-01).
- **Ninguna credencial ni cuenta entra al repo:** ni secretos, ni cuentas de servicio, ni contraseñas de las cuentas de prueba, ni tokens (DP-01). Lo controla el hook de pre-commit de `.claude/hooks/` (DP-07).
- **El proyecto de Firebase de Tabbie es de desarrollo:** lo confirmó su dueño el 2026-11-14, porque la app de Tabbie todavía no se liberó. La réplica y las cuentas de prueba lo siguen usando, como dice 0002 (DP-02).
- **Las credenciales de las cuentas de prueba se entregan con el formulario de entrega,** no en el repo. El `Readme.md` dice eso en lugar de listarlas (DP-35).
- Reemplaza la parte de 0002 que documenta las credenciales de las cuentas de prueba en el `Readme.md`. El resto de 0002 sigue igual.

## Estado

Aceptado.

## Consecuencias

- Quien lee el repo no puede iniciar sesión con las cuentas de prueba. El evaluador las recibe con el formulario de entrega.
- Las cuentas de prueba siguen existiendo en el proyecto de Firebase de Tabbie. Como es de desarrollo, una cuenta de prueba que inicia sesión contra el backend real crea su fila `user` en una base de desarrollo, no en la productiva (T01).
- Antes de que la app de Tabbie se libere, hay que revisar si las cuentas de prueba siguen en ese proyecto.
- Fuente: decisión del humano después de la revisión de la Entrega 1 (DP-01, DP-02 y DP-35).
