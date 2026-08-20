// Shared Paystack client for every Edge Function that talks to Paystack
// (initialize-checkout, paystack-webhook, confirm-order-delivered,
// confirm-order-received, cancel-order isn't a Paystack caller itself,
// process-refund). Duplicated nowhere — this is the one place that knows
// Paystack's request/response shapes, unlike nameMatch.ts which had to be
// duplicated because Edge Functions bundle from this tree only.
//
// Every call reads the response as .text() first, then JSON.parse — never
// .json() directly. This project hit two real bugs from that exact mistake
// already (see docs/reports/05-farmer-signup.md's "Post-review fixes"), so
// it's load-bearing here, not a style preference.

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function paystackFetch<T>(
  path: string,
  secretKey: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    console.error(`paystack: fetch to ${path} failed`, err);
    throw new PaystackError('Could not reach Paystack. Try again.', 502);
  }

  const rawBody = await response.text();
  let parsed: { status: boolean; message?: string; data?: T };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.error(`paystack: non-JSON response from ${path}`, response.status, rawBody.slice(0, 500));
    throw new PaystackError(`Paystack error (status ${response.status}).`, 502);
  }

  if (!response.ok || !parsed.status) {
    console.error(`paystack: ${path} rejected`, response.status, parsed.message);
    throw new PaystackError(parsed.message ?? 'Paystack rejected the request.', 422);
  }

  return parsed.data as T;
}

export type InitializeTransactionResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export function initializeTransaction(
  secretKey: string,
  args: { email: string; amountKobo: number; reference: string; callbackUrl: string }
): Promise<InitializeTransactionResult> {
  return paystackFetch('/transaction/initialize', secretKey, {
    method: 'POST',
    body: {
      email: args.email,
      amount: args.amountKobo,
      reference: args.reference,
      callback_url: args.callbackUrl,
    },
  });
}

export type VerifyTransactionResult = {
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  amount: number;
};

export function verifyTransaction(secretKey: string, reference: string): Promise<VerifyTransactionResult> {
  return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, secretKey);
}

export type TransferRecipientResult = {
  recipient_code: string;
};

export function createTransferRecipient(
  secretKey: string,
  args: { name: string; accountNumber: string; bankCode: string }
): Promise<TransferRecipientResult> {
  return paystackFetch('/transferrecipient', secretKey, {
    method: 'POST',
    body: {
      type: 'nuban',
      name: args.name,
      account_number: args.accountNumber,
      bank_code: args.bankCode,
      currency: 'NGN',
    },
  });
}

export type TransferResult = {
  transfer_code: string;
  status: string;
};

export function initiateTransfer(
  secretKey: string,
  args: { amountKobo: number; recipientCode: string; reason: string; reference: string }
): Promise<TransferResult> {
  return paystackFetch('/transfer', secretKey, {
    method: 'POST',
    body: {
      source: 'balance',
      amount: args.amountKobo,
      recipient: args.recipientCode,
      reason: args.reason,
      reference: args.reference,
    },
  });
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// Paystack signs the raw webhook body with HMAC-SHA512 using the secret key,
// sent as the `x-paystack-signature` header (hex-encoded). Verified via Web
// Crypto (available in the Deno edge runtime) rather than a Node crypto
// shim.
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time-ish comparison — lengths must match first (timing-safe
  // compare of unequal-length strings is meaningless anyway), then compare
  // byte-by-byte instead of a single `===` on the full string.
  if (computedHex.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}
