-- Consumer-side build. New notification types for the escrow lifecycle.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications
add constraint notifications_type_check check (
  type in (
    'new_order',
    'low_stock',
    'new_review',
    'verification',
    'order_paid',
    'delivery_confirmed_pending_other_side',
    'order_delivered_released',
    'order_cancelled',
    'refund_requested',
    'refund_completed',
    'new_message'
  )
);

-- An order row now exists before it's ever paid for (initialize-checkout
-- creates it, then Paystack is called) — notifying the farmer on raw INSERT
-- would fire for abandoned/never-completed checkouts. The 'order_paid'
-- notification (inserted by the paystack-webhook Edge Function once payment
-- is actually confirmed) replaces this as the farmer's "you have a new
-- order" signal.
drop trigger orders_notify_farmer_new_order on public.orders;
drop function public.notify_farmer_new_order ();
