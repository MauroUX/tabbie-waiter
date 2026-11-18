import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema inicial de la réplica: las 13 tablas de `docs/architecture/modelo-de-datos.md` (DP-51).
 *
 * Cómo se deshace:
 *  - `down` borra las FK y las 13 tablas en el orden inverso al de `up`
 *    (`node node_modules/typeorm/cli.js migration:revert -d dist/data-source.js`, dentro del contenedor de la réplica).
 *  - O se recrea la base desde cero: `docker compose down -v` y de nuevo `up`.
 *
 * Sin el @Check de los umbrales de `restaurant`: TypeORM no lo crea en MySQL (modelo-de-datos.md, 2.1).
 */
export class EsquemaInicial1794990000000 implements MigrationInterface {
  name = 'EsquemaInicial1794990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`restaurant\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`address\` varchar(255) NULL,
        \`phone\` varchar(255) NULL,
        \`mercadoPagoToken\` varchar(255) NULL,
        \`mercadoPagoRefreshToken\` varchar(255) NULL,
        \`mercadoPagoUserId\` bigint NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`specialtySubtitle\` text NULL,
        \`imageUrl\` text NULL,
        \`logoUrl\` text NULL,
        \`paymentStyle\` enum('before-order','after-order') NOT NULL DEFAULT 'after-order',
        \`yellowTicketSeconds\` int NOT NULL DEFAULT 300,
        \`redTicketSeconds\` int NOT NULL DEFAULT 420,
        \`redPulseTicketSeconds\` int NOT NULL DEFAULT 600,
        INDEX \`IDX_restaurant_mercadoPagoUserId\` (\`mercadoPagoUserId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`user\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`role\` enum('user','admin','waiter','backoffice') NOT NULL DEFAULT 'user',
        \`isGuest\` tinyint NOT NULL DEFAULT 0,
        \`name\` varchar(255) NULL,
        \`restaurantId\` varchar(36) NULL,
        UNIQUE INDEX \`UQ_user_email\` (\`email\`),
        INDEX \`IDX_user_restaurantId\` (\`restaurantId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_user_restaurantId\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurant\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`table\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`number\` int NOT NULL,
        \`seats\` int NOT NULL,
        \`qrCode\` varchar(500) NOT NULL,
        \`restaurantId\` varchar(36) NULL,
        \`activeSessionId\` int NULL,
        \`isBusy\` tinyint NOT NULL DEFAULT 0,
        INDEX \`IDX_table_restaurantId\` (\`restaurantId\`),
        INDEX \`IDX_table_isBusy\` (\`isBusy\`),
        INDEX \`IDX_table_activeSessionId\` (\`activeSessionId\`),
        INDEX \`IDX_table_restaurantId_isBusy\` (\`restaurantId\`, \`isBusy\`),
        UNIQUE INDEX \`UQ_table_restaurantId_number\` (\`restaurantId\`, \`number\`),
        UNIQUE INDEX \`UQ_table_qrCode\` (\`qrCode\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_table_restaurantId\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurant\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`table_session\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tableId\` int NOT NULL,
        \`amountPaid\` decimal(10,2) NOT NULL DEFAULT 0,
        \`tips\` decimal(10,2) NOT NULL DEFAULT 0,
        \`total\` decimal(10,2) NOT NULL DEFAULT 0,
        \`requestingHelp\` tinyint NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`closedAt\` datetime NULL,
        INDEX \`IDX_table_session_tableId\` (\`tableId\`),
        INDEX \`IDX_table_session_closedAt\` (\`closedAt\`),
        INDEX \`IDX_table_session_tableId_closedAt\` (\`tableId\`, \`closedAt\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_table_session_tableId\` FOREIGN KEY (\`tableId\`) REFERENCES \`table\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`table_session_users_user\` (
        \`tableSessionId\` int NOT NULL,
        \`userId\` int NOT NULL,
        INDEX \`IDX_table_session_users_user_tableSessionId\` (\`tableSessionId\`),
        INDEX \`IDX_table_session_users_user_userId\` (\`userId\`),
        PRIMARY KEY (\`tableSessionId\`, \`userId\`),
        CONSTRAINT \`FK_table_session_users_user_tableSessionId\` FOREIGN KEY (\`tableSessionId\`) REFERENCES \`table_session\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_table_session_users_user_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`product\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`deletedSince\` datetime NULL,
        \`imageUrl\` text NULL,
        \`hide\` tinyint NOT NULL,
        \`price\` decimal(10,0) NOT NULL,
        \`acceptsNotes\` tinyint NOT NULL DEFAULT 1,
        \`isVegan\` tinyint NOT NULL DEFAULT 0,
        \`glutenFree\` tinyint NOT NULL DEFAULT 0,
        \`category\` text NULL,
        \`restaurantId\` varchar(36) NULL,
        INDEX \`IDX_product_restaurantId\` (\`restaurantId\`),
        INDEX \`IDX_product_restaurantId_name\` (\`restaurantId\`, \`name\`),
        INDEX \`IDX_product_restaurantId_deletedSince\` (\`restaurantId\`, \`deletedSince\`),
        INDEX \`IDX_product_deletedSince\` (\`deletedSince\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_product_restaurantId\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurant\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_option\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`type\` enum('single-choice','multiple-choice') NOT NULL DEFAULT 'single-choice',
        \`limit\` int NOT NULL,
        \`productId\` int NULL,
        INDEX \`IDX_product_option_productId\` (\`productId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_product_option_productId\` FOREIGN KEY (\`productId\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`product_option_value\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`description\` text NOT NULL,
        \`limit\` int NOT NULL,
        \`price\` decimal(10,0) NOT NULL,
        \`productOptionId\` int NULL,
        INDEX \`IDX_product_option_value_productOptionId\` (\`productOptionId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_product_option_value_productOptionId\` FOREIGN KEY (\`productOptionId\`) REFERENCES \`product_option\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`order\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tableSessionId\` int NULL,
        \`userId\` int NULL,
        \`restaurantId\` varchar(36) NULL,
        \`type\` enum('appetizer','main_course','dessert') NOT NULL DEFAULT 'main_course',
        \`status\` enum('pending','confirmed','in_kitchen','canceled') NOT NULL DEFAULT 'pending',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`confirmedAt\` datetime NULL,
        \`sentToKitchenAt\` datetime NULL,
        \`canceledAt\` datetime NULL,
        \`cancellationReason\` text NULL,
        \`isPaid\` tinyint NOT NULL DEFAULT 0,
        \`paidAt\` datetime NULL,
        INDEX \`IDX_order_tableSessionId\` (\`tableSessionId\`),
        INDEX \`IDX_order_restaurantId\` (\`restaurantId\`),
        INDEX \`IDX_order_status\` (\`status\`),
        INDEX \`IDX_order_tableSessionId_status\` (\`tableSessionId\`, \`status\`),
        INDEX \`IDX_order_tableSessionId_isPaid_createdAt\` (\`tableSessionId\`, \`isPaid\`, \`createdAt\`),
        INDEX \`IDX_order_tableSessionId_userId_isPaid_createdAt\` (\`tableSessionId\`, \`userId\`, \`isPaid\`, \`createdAt\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_order_tableSessionId\` FOREIGN KEY (\`tableSessionId\`) REFERENCES \`table_session\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_order_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_order_restaurantId\` FOREIGN KEY (\`restaurantId\`) REFERENCES \`restaurant\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`order_product_details\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`orderId\` int NULL,
        \`productId\` int NULL,
        \`quantity\` int NOT NULL,
        \`quantityPaid\` int NOT NULL DEFAULT 0,
        \`note\` text NULL,
        INDEX \`IDX_order_product_details_orderId\` (\`orderId\`),
        INDEX \`IDX_order_product_details_productId\` (\`productId\`),
        INDEX \`IDX_order_product_details_orderId_productId\` (\`orderId\`, \`productId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_order_product_details_orderId\` FOREIGN KEY (\`orderId\`) REFERENCES \`order\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_order_product_details_productId\` FOREIGN KEY (\`productId\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`order_product_option\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`orderProductId\` int NULL,
        \`productOptionId\` int NULL,
        INDEX \`IDX_order_product_option_orderProductId\` (\`orderProductId\`),
        INDEX \`IDX_order_product_option_productOptionId\` (\`productOptionId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_order_product_option_orderProductId\` FOREIGN KEY (\`orderProductId\`) REFERENCES \`order_product_details\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_order_product_option_productOptionId\` FOREIGN KEY (\`productOptionId\`) REFERENCES \`product_option\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`order_product_option_values_product_option_value\` (
        \`orderProductOptionId\` int NOT NULL,
        \`productOptionValueId\` int NOT NULL,
        INDEX \`IDX_opovpov_orderProductOptionId\` (\`orderProductOptionId\`),
        INDEX \`IDX_opovpov_productOptionValueId\` (\`productOptionValueId\`),
        PRIMARY KEY (\`orderProductOptionId\`, \`productOptionValueId\`),
        CONSTRAINT \`FK_opovpov_orderProductOptionId\` FOREIGN KEY (\`orderProductOptionId\`) REFERENCES \`order_product_option\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_opovpov_productOptionValueId\` FOREIGN KEY (\`productOptionValueId\`) REFERENCES \`product_option_value\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`payment\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`sessionId\` int NOT NULL,
        \`amount\` decimal(10,2) NOT NULL DEFAULT 0,
        \`currency\` varchar(255) NOT NULL,
        \`method\` varchar(255) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`prepaid\` tinyint NOT NULL DEFAULT 0,
        \`userId\` int NULL,
        INDEX \`IDX_payment_sessionId_createdAt\` (\`sessionId\`, \`createdAt\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_payment_sessionId\` FOREIGN KEY (\`sessionId\`) REFERENCES \`table_session\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_payment_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso al de `up`: primero las tablas que dependen de otras. Borrar la tabla borra sus FK.
    const tablas = [
      'payment',
      'order_product_option_values_product_option_value',
      'order_product_option',
      'order_product_details',
      'order',
      'product_option_value',
      'product_option',
      'product',
      'table_session_users_user',
      'table_session',
      'table',
      'user',
      'restaurant',
    ];
    for (const tabla of tablas) {
      await queryRunner.query(`DROP TABLE \`${tabla}\``);
    }
  }
}
