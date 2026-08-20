export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'packaged'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type FulfillmentType = 'pickup' | 'delivery';

// The farmer-visible stage list, in order. 'delivered' is deliberately the
// last stage shown but is NEVER something either party's own action sets
// directly — it's computed by the confirm-order-delivered/received Edge
// Functions once BOTH farmer_confirmed_at and household_confirmed_at are
// set (see 20260821090200_orders_escrow.sql's orders_update_farmer_advance_
// only policy, which blocks a raw client write from ever reaching it).
export function stageLabel(status: OrderStatus, fulfillmentType: FulfillmentType | null): string {
  switch (status) {
    case 'pending':
      return 'Placed';
    case 'preparing':
      return 'Preparing';
    case 'packaged':
      return 'Packaged';
    case 'ready_for_pickup':
      return 'Ready for pickup';
    case 'out_for_delivery':
      return 'Out for delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return fulfillmentType === 'pickup' ? 'Ready for pickup' : 'Out for delivery';
  }
}

export function fourthStageStatus(fulfillmentType: FulfillmentType | null): OrderStatus {
  return fulfillmentType === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery';
}

// The 5 stages shown on the progress bar, already resolved to this order's
// fulfillment type (stage 4 is either ready_for_pickup or out_for_delivery,
// never both).
export function progressStages(fulfillmentType: FulfillmentType | null): OrderStatus[] {
  return ['pending', 'preparing', 'packaged', fourthStageStatus(fulfillmentType), 'delivered'];
}

export function stageIndex(status: OrderStatus, fulfillmentType: FulfillmentType | null): number {
  const stages = progressStages(fulfillmentType);
  const index = stages.indexOf(status);
  return index === -1 ? 0 : index;
}

// True once the order has reached the stage where either side's delivery
// confirmation becomes meaningful (farmer's "Product Delivered" / household's
// "Product Received").
export function isAtDeliveryConfirmationStage(
  status: OrderStatus,
  fulfillmentType: FulfillmentType | null
): boolean {
  return status === fourthStageStatus(fulfillmentType) || status === 'delivered';
}

// The next status the farmer's plain "advance" button should set, or null
// once they've reached the pre-delivery stage (from there, the action is
// "Product Delivered" via confirm-order-delivered, not a raw status write)
// or the order is in a terminal state.
export function nextFarmerStatus(
  status: OrderStatus,
  fulfillmentType: FulfillmentType | null
): OrderStatus | null {
  const fourth = fourthStageStatus(fulfillmentType);
  if (status === 'pending') return 'preparing';
  if (status === 'preparing') return 'packaged';
  if (status === 'packaged') return fourth;
  return null;
}

export function nextFarmerActionLabel(
  status: OrderStatus,
  fulfillmentType: FulfillmentType | null
): string | null {
  const next = nextFarmerStatus(status, fulfillmentType);
  if (!next) return null;
  if (next === 'preparing') return 'Start preparing';
  if (next === 'packaged') return 'Mark packaged';
  if (next === 'ready_for_pickup') return 'Mark ready for pickup';
  if (next === 'out_for_delivery') return 'Mark out for delivery';
  return null;
}
