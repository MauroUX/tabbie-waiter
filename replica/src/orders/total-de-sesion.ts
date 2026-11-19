import { EntityManager } from 'typeorm';

/**
 * Recalcula `table_session.total` (DP-77): la suma, en los pedidos `confirmed` e `in_kitchen` de la sesión, de
 * `(product.price + suma de los price de los valores elegidos) × quantity`, con dos decimales.
 * La usan `confirm` y, después, los endpoints de TK-08 que cambian qué pedidos cuentan. Devuelve el total guardado.
 */
export async function recalcularTotalDeSesion(manager: EntityManager, sesionId: number): Promise<string> {
  const [fila] = await manager.query(
    `SELECT CAST(COALESCE(SUM((p.price + COALESCE(v.suma, 0)) * d.quantity), 0) AS DECIMAL(10,2)) AS total
       FROM order_product_details d
       JOIN \`order\` o ON o.id = d.orderId
       JOIN product p ON p.id = d.productId
       LEFT JOIN (
         SELECT opo.orderProductId AS lineaId, SUM(pv.price) AS suma
           FROM order_product_option opo
           JOIN order_product_option_values_product_option_value x ON x.orderProductOptionId = opo.id
           JOIN product_option_value pv ON pv.id = x.productOptionValueId
          GROUP BY opo.orderProductId
       ) v ON v.lineaId = d.id
      WHERE o.tableSessionId = ? AND o.status IN ('confirmed', 'in_kitchen')`,
    [sesionId],
  );
  const total = String(fila.total);
  await manager.query('UPDATE `table_session` SET total = ? WHERE id = ?', [total, sesionId]);
  return total;
}
