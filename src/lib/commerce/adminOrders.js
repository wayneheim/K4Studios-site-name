export function groupAdminOrders(orders) {
  const groups = { completed: [], unfinished: [], canceled: [] };
  for (const order of orders) {
    if ([order.paymentStatus, order.financialStatus, order.fulfillmentStatus].includes("canceled")) {
      groups.canceled.push(order);
    } else if (order.paidAt || order.paypalCaptureId || order.paymentStatus === "paid"
      || ["paid", "refunded", "partially_refunded", "disputed", "reversed", "approval_reversed"].includes(order.financialStatus)) {
      groups.completed.push(order);
    } else {
      groups.unfinished.push(order);
    }
  }
  return groups;
}
