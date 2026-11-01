function nowIso() {
  return new Date().toISOString();
}

export function buildEditionReservationGroups(items) {
  const groups = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.inventoryKey || !Number.isInteger(item?.editionLimit) || item.editionLimit <= 0) continue;
    const quantity = Number(item.quantity);
    const baselineSold = Math.max(0, Number(item.editionBaselineSold) || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid limited-edition quantity.");

    const current = groups.get(item.inventoryKey);
    if (current) {
      if (current.editionLimit !== item.editionLimit || current.baselineSold !== baselineSold) {
        throw new Error("Conflicting limited-edition inventory data.");
      }
      current.quantity += quantity;
    } else {
      groups.set(item.inventoryKey, {
        inventoryKey: String(item.inventoryKey),
        imageId: String(item.imageId),
        seriesKey: String(item.seriesKey),
        editionLimit: item.editionLimit,
        baselineSold,
        quantity,
      });
    }
  }

  const result = [...groups.values()];
  for (const group of result) {
    if (group.baselineSold + group.quantity > group.editionLimit) {
      throw new Error("The requested limited edition is sold out or no longer has sufficient availability.");
    }
  }
  return result;
}

export async function reserveEditionInventory(db, orderId, items) {
  const groups = buildEditionReservationGroups(items);
  if (!groups.length) return [];

  const existing = await db.prepare(`
    SELECT inventory_key, quantity, status
    FROM edition_allocations
    WHERE order_id = ?
  `).bind(orderId).all();
  const existingRows = existing.results || [];
  if (existingRows.length) {
    const expected = new Map(groups.map((group) => [group.inventoryKey, group.quantity]));
    const valid = existingRows.length === groups.length && existingRows.every((row) => (
      expected.get(row.inventory_key) === Number(row.quantity)
      && (row.status === "reserved" || row.status === "sold")
    ));
    if (!valid) throw new Error("The order's limited-edition reservation is inconsistent.");
    return existingRows;
  }

  const now = nowIso();
  const statements = [];
  for (const group of groups) {
    statements.push(db.prepare(`
      INSERT INTO edition_inventory (
        inventory_key, image_id, series_key, edition_limit, baseline_sold,
        checkout_sold, reserved_quantity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
      ON CONFLICT(inventory_key) DO UPDATE SET
        reserved_quantity = edition_inventory.reserved_quantity + excluded.reserved_quantity,
        updated_at = excluded.updated_at
    `).bind(
      group.inventoryKey, group.imageId, group.seriesKey, group.editionLimit,
      group.baselineSold, group.quantity, now, now,
    ));
    statements.push(db.prepare(`
      INSERT INTO edition_allocations (
        id, order_id, inventory_key, image_id, series_key, quantity, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?, ?)
    `).bind(
      `edition:${orderId}:${group.inventoryKey}`,
      orderId, group.inventoryKey, group.imageId, group.seriesKey, group.quantity, now, now,
    ));
  }

  try {
    await db.batch(statements);
  } catch (error) {
    if (/constraint|edition_inventory/i.test(String(error?.message || error))) {
      throw new Error("The requested limited edition is sold out or currently reserved by another order.");
    }
    throw error;
  }
  return groups;
}

export async function commitEditionReservations(db, orderId) {
  const result = await db.prepare(`
    SELECT inventory_key, quantity
    FROM edition_allocations
    WHERE order_id = ? AND status = 'reserved'
  `).bind(orderId).all();
  const rows = result.results || [];
  if (!rows.length) return [];

  const now = nowIso();
  const statements = [];
  for (const row of rows) {
    const quantity = Number(row.quantity);
    statements.push(db.prepare(`
      UPDATE edition_inventory
      SET reserved_quantity = reserved_quantity - ?,
          checkout_sold = checkout_sold + ?,
          updated_at = ?
      WHERE inventory_key = ? AND reserved_quantity >= ?
    `).bind(quantity, quantity, now, row.inventory_key, quantity));
    statements.push(db.prepare(`
      UPDATE edition_allocations
      SET status = 'sold', updated_at = ?
      WHERE order_id = ? AND inventory_key = ? AND status = 'reserved'
    `).bind(now, orderId, row.inventory_key));
  }
  await db.batch(statements);
  return rows;
}

export async function releaseEditionReservations(db, orderId) {
  const result = await db.prepare(`
    SELECT inventory_key, quantity
    FROM edition_allocations
    WHERE order_id = ? AND status = 'reserved'
  `).bind(orderId).all();
  const rows = result.results || [];
  if (!rows.length) return [];

  const now = nowIso();
  const statements = [];
  for (const row of rows) {
    const quantity = Number(row.quantity);
    statements.push(db.prepare(`
      UPDATE edition_inventory
      SET reserved_quantity = reserved_quantity - ?, updated_at = ?
      WHERE inventory_key = ? AND reserved_quantity >= ?
    `).bind(quantity, now, row.inventory_key, quantity));
    statements.push(db.prepare(`
      UPDATE edition_allocations
      SET status = 'released', updated_at = ?
      WHERE order_id = ? AND inventory_key = ? AND status = 'reserved'
    `).bind(now, orderId, row.inventory_key));
  }
  await db.batch(statements);
  return rows;
}
