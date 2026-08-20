// Shared by confirm-order-delivered and confirm-order-received — the actual
// "both sides confirmed, release the money" step. Kept in one place rather
// than duplicated in both functions, since it's the single most
// money-sensitive piece of logic in this app.
import { getOrCreateRecipientCode, sendTransfer } from './payoutHelpers.ts';

// deno-lint-ignore no-explicit-any
type AdminClient = any;

export async function releaseFundsIfBothConfirmed(
  admin: AdminClient,
  paystackSecretKey: string,
  orderId: string
): Promise<{ released: boolean }> {
  const { data: order } = await admin
    .from('orders')
    .select('id, farmer_id, household_id, total, payment_status, farmer_confirmed_at, household_confirmed_at')
    .eq('id', orderId)
    .single();

  if (!order || !order.farmer_confirmed_at || !order.household_confirmed_at) {
    return { released: false };
  }

  // Idempotency: only the update that actually flips payment_status away
  // from 'paid_held' gets to disburse — a second near-simultaneous call
  // (both confirmations landing at once) finds nothing left to claim.
  const { data: claimed } = await admin
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId)
    .eq('payment_status', 'paid_held')
    .select('id')
    .maybeSingle();

  if (!claimed) {
    return { released: false };
  }

  const { data: farmerProfile } = await admin
    .from('farmer_profiles')
    .select('profile_id')
    .eq('id', order.farmer_id)
    .single();

  try {
    const recipientCode = await getOrCreateRecipientCode(admin, paystackSecretKey, farmerProfile!.profile_id);
    const { transferCode } = await sendTransfer(paystackSecretKey, {
      recipientCode,
      amount: Number(order.total),
      reason: `Market2pot order ${order.id}`,
      reference: `payout_${order.id}`,
    });

    await admin.from('payouts').insert({
      order_id: order.id,
      farmer_id: order.farmer_id,
      amount: order.total,
      paystack_transfer_code: transferCode,
      status: 'pending',
    });
    await admin.from('orders').update({ payment_status: 'released' }).eq('id', order.id);
    await admin.from('notifications').insert({
      profile_id: farmerProfile!.profile_id,
      type: 'order_delivered_released',
      title: 'Order delivered — payment released',
      body: `Your payout for order ${order.id.slice(0, 8)} is on its way to your bank account.`,
      related_id: order.id,
    });
  } catch (err) {
    // The order is genuinely delivered (both sides confirmed) even if the
    // transfer itself failed (e.g. no bank account on file yet, or a
    // transient Paystack error) — leave payment_status at 'paid_held' so
    // it's visibly not-yet-disbursed rather than silently losing the
    // obligation, and tell the farmer why.
    console.error('releaseFundsIfBothConfirmed: transfer failed', err);
    await admin.from('notifications').insert({
      profile_id: farmerProfile!.profile_id,
      type: 'order_delivered_released',
      title: 'Order delivered — payout pending',
      body: 'Add your bank details in Business Settings so we can send your payment.',
      related_id: order.id,
    });
  }

  return { released: true };
}
