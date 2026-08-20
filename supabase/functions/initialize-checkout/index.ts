// Creates the orders/order_items rows and starts a Paystack transaction.
// The ONLY path that creates an order — orders_insert_household and
// order_items_insert_via_own_order were both dropped in
// 20260821090200_orders_escrow.sql specifically so pricing math can never be
// trusted from a client-supplied INSERT. Everything here runs off
// ctx.supabase (RLS-scoped to the caller) for reads, and ctx.supabaseAdmin
// only for the actual order/order_items writes.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { initializeTransaction, nairaToKobo } from '../_shared/paystack.ts';

type RequestBody = {
  fulfillment_type?: 'pickup' | 'delivery';
  delivery_zone_id?: string | null;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims.id;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://market2pot.com';
    if (!paystackSecretKey) {
      return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
    }

    const { fulfillment_type: fulfillmentType, delivery_zone_id: deliveryZoneId } =
      (await req.json()) as RequestBody;
    if (fulfillmentType !== 'pickup' && fulfillmentType !== 'delivery') {
      return Response.json({ error: "fulfillment_type must be 'pickup' or 'delivery'" }, { status: 400 });
    }
    if (fulfillmentType === 'delivery' && !deliveryZoneId) {
      return Response.json({ error: 'delivery_zone_id is required for delivery' }, { status: 400 });
    }

    const { data: cartRows, error: cartError } = await ctx.supabase
      .from('cart_items')
      .select('quantity, products(id, name, price, farmer_id, quantity_available, is_available)')
      .eq('household_id', userId);
    if (cartError) {
      return Response.json({ error: cartError.message }, { status: 500 });
    }
    if (!cartRows || cartRows.length === 0) {
      return Response.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    type CartRow = (typeof cartRows)[number] & {
      products: {
        id: string;
        name: string;
        price: number;
        farmer_id: string;
        quantity_available: number;
        is_available: boolean;
      } | null;
    };
    const rows = cartRows as CartRow[];

    const farmerIds = new Set(rows.map((row) => row.products?.farmer_id).filter(Boolean));
    if (farmerIds.size !== 1) {
      // Shouldn't happen — the client enforces one farmer per cart — but a
      // server-side check never trusts that alone.
      return Response.json({ error: 'Your cart must contain items from a single farmer.' }, { status: 400 });
    }
    const farmerId = [...farmerIds][0] as string;

    for (const row of rows) {
      if (!row.products || !row.products.is_available) {
        return Response.json({ error: 'One of your cart items is no longer available.' }, { status: 400 });
      }
      if (row.quantity > row.products.quantity_available) {
        return Response.json(
          { error: `Only ${row.products.quantity_available} of "${row.products.name}" left.` },
          { status: 400 }
        );
      }
    }

    // Active-promotion pricing per line — the promotions system this app
    // already has would otherwise never actually affect a real purchase.
    const { data: promoRows } = await ctx.supabase
      .from('promotions')
      .select('product_id, discount_percent')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .in('product_id', rows.map((row) => row.products!.id));
    const discountByProduct = new Map((promoRows ?? []).map((p) => [p.product_id, p.discount_percent]));

    const orderItems = rows.map((row) => {
      const product = row.products!;
      const discount = discountByProduct.get(product.id) ?? 0;
      const unitPrice = Math.round(product.price * (1 - discount / 100) * 100) / 100;
      return {
        product_id: product.id,
        product_name_snapshot: product.name,
        quantity: row.quantity,
        unit_price: unitPrice,
        line_total: Math.round(unitPrice * row.quantity * 100) / 100,
      };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0);

    let deliveryFee = 0;
    let deliveryAddress: string | null = null;
    if (fulfillmentType === 'delivery') {
      const { data: zone, error: zoneError } = await ctx.supabase
        .from('delivery_zones')
        .select('fee, farmer_id, is_active')
        .eq('id', deliveryZoneId!)
        .single();
      if (zoneError || !zone || zone.farmer_id !== farmerId || !zone.is_active) {
        return Response.json({ error: 'That delivery zone is not available.' }, { status: 400 });
      }
      deliveryFee = Number(zone.fee);

      const { data: location } = await ctx.supabase
        .from('delivery_locations')
        .select('address_line')
        .eq('profile_id', userId)
        .maybeSingle();
      if (!location) {
        return Response.json({ error: 'Add a delivery address before checking out.' }, { status: 400 });
      }
      deliveryAddress = location.address_line;
    }

    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from('orders')
      .insert({
        household_id: userId,
        farmer_id: farmerId,
        fulfillment_type: fulfillmentType,
        delivery_address: deliveryAddress,
        subtotal,
        total,
        status: 'pending',
        payment_status: 'pending',
      })
      .select('id')
      .single();
    if (orderError || !order) {
      return Response.json({ error: orderError?.message ?? 'Could not create order' }, { status: 500 });
    }

    const { error: itemsError } = await ctx.supabaseAdmin
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) {
      await ctx.supabaseAdmin.from('orders').delete().eq('id', order.id);
      return Response.json({ error: itemsError.message }, { status: 500 });
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser();
    const reference = `order_${order.id}`;

    try {
      const transaction = await initializeTransaction(paystackSecretKey, {
        email: user?.email ?? `${userId}@market2pot.com`,
        amountKobo: nairaToKobo(total),
        reference,
        callbackUrl: `${appBaseUrl}/payment/callback`,
      });

      await ctx.supabaseAdmin.from('orders').update({ paystack_reference: reference }).eq('id', order.id);

      return Response.json({
        order_id: order.id,
        authorization_url: transaction.authorization_url,
        reference,
      });
    } catch (err) {
      await ctx.supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
      await ctx.supabaseAdmin.from('orders').delete().eq('id', order.id);
      const message = err instanceof Error ? err.message : 'Could not start payment.';
      return Response.json({ error: message }, { status: 502 });
    }
  }),
};
