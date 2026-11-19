-- Datos iniciales sintéticos de la réplica (TK-02, DP-16, DP-66 a DP-71).
-- Se cargan sobre la base que crean las migraciones, con replica/datos-iniciales/cargar.sh.
--
-- Todo es inventado: ningún dato es de Tabbie. Los correos son de example.com, y los valores de cobro de los
-- restaurantes llevan la marca FALSO-NO-ES-MERCADOPAGO- para que se reconozcan como de mentira (PR-2, PR-3, SEG-c11).
-- Todas las claves son fijas (el uuid de cada restaurante y el ID de cada fila con autoincremento): dos cargas
-- desde cero dan la misma base, valor por valor.
-- Los precios son enteros: la columna es decimal(10,0) y un valor con decimales se redondearía en silencio.
-- Todo va en una transacción: si algo falla, no queda nada a medias.
--
-- Cómo se deshace: solo recreando la base (docker compose --env-file replica/entornos/pruebas.env down -v y de
-- nuevo up -d --build --wait). No hay migración nueva ni DELETE que lo revierta.

SET NAMES utf8mb4;

START TRANSACTION;

-- Restaurantes. Restaurante 1: umbrales cortos (60, 120 y 180 segundos); restaurante 2: los de siempre (DP-67).
-- mercadoPagoUserId queda en NULL (DP-69); paymentStyle after-order (DP-66).
INSERT INTO `restaurant`
  (`id`, `name`, `address`, `phone`, `mercadoPagoToken`, `mercadoPagoRefreshToken`, `mercadoPagoUserId`,
   `isActive`, `specialtySubtitle`, `imageUrl`, `logoUrl`, `paymentStyle`,
   `yellowTicketSeconds`, `redTicketSeconds`, `redPulseTicketSeconds`)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'La Parrilla de Prueba', 'Calle Falsa 123, Ciudad de Ejemplo',
   '+00 000 000 0001', 'FALSO-NO-ES-MERCADOPAGO-token-r1', 'FALSO-NO-ES-MERCADOPAGO-refresh-r1', NULL,
   1, NULL, NULL, NULL, 'after-order', 60, 120, 180),
  ('22222222-2222-4222-8222-222222222222', 'Cantina de Ejemplo', 'Avenida Inventada 456, Ciudad de Ejemplo',
   '+00 000 000 0002', 'FALSO-NO-ES-MERCADOPAGO-token-r2', 'FALSO-NO-ES-MERCADOPAGO-refresh-r2', NULL,
   1, NULL, NULL, NULL, 'after-order', 300, 420, 600);

-- Mesas: 8 en el restaurante 1 y 4 en el 2, libres y con entre 2 y 6 lugares.
INSERT INTO `table` (`id`, `number`, `seats`, `qrCode`, `restaurantId`, `activeSessionId`, `isBusy`)
VALUES
  (1, 1, 2, 'waiterapp-r1-mesa-01', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (2, 2, 2, 'waiterapp-r1-mesa-02', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (3, 3, 4, 'waiterapp-r1-mesa-03', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (4, 4, 4, 'waiterapp-r1-mesa-04', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (5, 5, 4, 'waiterapp-r1-mesa-05', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (6, 6, 6, 'waiterapp-r1-mesa-06', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (7, 7, 6, 'waiterapp-r1-mesa-07', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (8, 8, 3, 'waiterapp-r1-mesa-08', '11111111-1111-4111-8111-111111111111', NULL, 0),
  (9, 1, 2, 'waiterapp-r2-mesa-01', '22222222-2222-4222-8222-222222222222', NULL, 0),
  (10, 2, 4, 'waiterapp-r2-mesa-02', '22222222-2222-4222-8222-222222222222', NULL, 0),
  (11, 3, 4, 'waiterapp-r2-mesa-03', '22222222-2222-4222-8222-222222222222', NULL, 0),
  (12, 4, 6, 'waiterapp-r2-mesa-04', '22222222-2222-4222-8222-222222222222', NULL, 0);

-- Menú. Restaurante 1: 8 productos en cuatro categorías. Restaurante 2: 3 productos.
INSERT INTO `product`
  (`id`, `name`, `description`, `deletedSince`, `imageUrl`, `hide`, `price`, `acceptsNotes`, `isVegan`,
   `glutenFree`, `category`, `restaurantId`)
VALUES
  (1, 'Provoleta', 'Provoleta a la parrilla con orégano', NULL, NULL, 0, 4500, 1, 0, 1, 'Entradas',
   '11111111-1111-4111-8111-111111111111'),
  (2, 'Ensalada de la casa', 'Hojas verdes, tomate y zanahoria', NULL, NULL, 0, 3800, 1, 1, 1, 'Entradas',
   '11111111-1111-4111-8111-111111111111'),
  (3, 'Bife de chorizo', 'Bife de chorizo con guarnición', NULL, NULL, 0, 12500, 1, 0, 1, 'Principales',
   '11111111-1111-4111-8111-111111111111'),
  (4, 'Milanesa napolitana', 'Milanesa con jamón, queso y salsa', NULL, NULL, 0, 9800, 1, 0, 0, 'Principales',
   '11111111-1111-4111-8111-111111111111'),
  (5, 'Pasta con salsa', 'Pasta con salsa de tomate casera', NULL, NULL, 0, 7600, 1, 1, 0, 'Principales',
   '11111111-1111-4111-8111-111111111111'),
  (6, 'Agua mineral', 'Botella de 500 ml', NULL, NULL, 0, 1500, 0, 1, 1, 'Bebidas',
   '11111111-1111-4111-8111-111111111111'),
  (7, 'Cerveza artesanal', 'Pinta de cerveza rubia', NULL, NULL, 0, 3200, 0, 1, 0, 'Bebidas',
   '11111111-1111-4111-8111-111111111111'),
  (8, 'Flan casero', 'Flan con dulce de leche', NULL, NULL, 0, 3500, 1, 0, 1, 'Postres',
   '11111111-1111-4111-8111-111111111111'),
  (9, 'Empanadas de carne', 'Media docena de empanadas', NULL, NULL, 0, 6000, 1, 0, 0, 'Entradas',
   '22222222-2222-4222-8222-222222222222'),
  (10, 'Pizza muzzarella', 'Pizza grande de muzzarella', NULL, NULL, 0, 8500, 1, 0, 0, 'Principales',
   '22222222-2222-4222-8222-222222222222'),
  (11, 'Gaseosa', 'Botella de 500 ml', NULL, NULL, 0, 1800, 0, 1, 1, 'Bebidas',
   '22222222-2222-4222-8222-222222222222');

-- Una opción de un producto del restaurante 1: el punto de cocción del bife, con tres valores (DP-68).
INSERT INTO `product_option` (`id`, `name`, `description`, `type`, `limit`, `productId`)
VALUES
  (1, 'Punto de cocción', 'Cómo se prefiere la carne', 'single-choice', 1, 3);

INSERT INTO `product_option_value` (`id`, `description`, `limit`, `price`, `productOptionId`)
VALUES
  (1, 'Jugoso', 1, 0, 1),
  (2, 'A punto', 1, 0, 1),
  (3, 'Bien cocido', 1, 0, 1);

-- Usuarios: dos mozos y un usuario del restaurante 1, un mozo del 2 y un comensal sin restaurante.
-- Las cuentas de Firebase de estos correos las crea replica/firebase/ (modo crear); acá no hay contraseñas.
INSERT INTO `user` (`id`, `email`, `role`, `isGuest`, `name`, `restaurantId`)
VALUES
  (1, 'waiterapp.mozo1.r1@example.com', 'waiter', 0, 'Mozo Uno Restaurante Uno', '11111111-1111-4111-8111-111111111111'),
  (2, 'waiterapp.mozo2.r1@example.com', 'waiter', 0, 'Mozo Dos Restaurante Uno', '11111111-1111-4111-8111-111111111111'),
  (3, 'waiterapp.mozo1.r2@example.com', 'waiter', 0, 'Mozo Uno Restaurante Dos', '22222222-2222-4222-8222-222222222222'),
  (4, 'waiterapp.usuario.r1@example.com', 'user', 0, 'Usuario Restaurante Uno', '11111111-1111-4111-8111-111111111111'),
  (5, 'waiterapp.comensal@example.com', 'user', 0, 'Comensal de Prueba', NULL);

COMMIT;
