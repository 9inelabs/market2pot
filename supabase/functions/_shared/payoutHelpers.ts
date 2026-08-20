// Shared by confirm-order-delivered/confirm-order-received (farmer payout)
// and process-refund (household refund) — both are "send this profile's
// bank_accounts row some money via Paystack Transfer" with the recipient
// cached so repeat disbursements to the same account don't recreate one.
import { createTransferRecipient, initiateTransfer, nairaToKobo } from './paystack.ts';

// deno-lint-ignore no-explicit-any
type AdminClient = any;

// Returns the cached recipient_code, creating (and persisting) one if this
// is the account's first ever disbursement. Throws if the profile has no
// bank_accounts row at all — the caller decides how to surface that.
export async function getOrCreateRecipientCode(
  admin: AdminClient,
  paystackSecretKey: string,
  profileId: string
): Promise<string> {
  const { data: bankAccount, error } = await admin
    .from('bank_accounts')
    .select('id, bank_code, account_number, resolved_account_name, paystack_recipient_code')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !bankAccount) {
    throw new Error('No bank account on file for this profile.');
  }
  if (bankAccount.paystack_recipient_code) {
    return bankAccount.paystack_recipient_code;
  }

  const recipient = await createTransferRecipient(paystackSecretKey, {
    name: bankAccount.resolved_account_name,
    accountNumber: bankAccount.account_number,
    bankCode: bankAccount.bank_code,
  });

  await admin
    .from('bank_accounts')
    .update({ paystack_recipient_code: recipient.recipient_code })
    .eq('id', bankAccount.id);

  return recipient.recipient_code;
}

export async function sendTransfer(
  paystackSecretKey: string,
  args: { recipientCode: string; amount: number; reason: string; reference: string }
): Promise<{ transferCode: string }> {
  const result = await initiateTransfer(paystackSecretKey, {
    amountKobo: nairaToKobo(args.amount),
    recipientCode: args.recipientCode,
    reason: args.reason,
    reference: args.reference,
  });
  return { transferCode: result.transfer_code };
}
