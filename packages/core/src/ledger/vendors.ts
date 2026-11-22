import type { LedgerRow } from './table';

/**
 * Third-party vendors that must only appear in a pack when the decision ledger names them.
 * The guides and examples shipped with Blueprint come from other projects and mention some of these;
 * the founder's stack always wins.
 */
export type VendorCategory = 'auth' | 'payments' | 'email' | 'sms' | 'maps';

export interface Vendor {
  name: string;
  category: VendorCategory;
  /** Case-insensitive pattern; matches the name and its environment-variable form. */
  pattern: RegExp;
}

const v = (name: string, category: VendorCategory, pattern: RegExp = new RegExp(name.replace(/\s+/g, '[\\s_-]*'), 'i')): Vendor => ({
  name,
  category,
  pattern,
});

export const VENDORS: Vendor[] = [
  v('Clerk', 'auth', /\bClerk\b(?!\s+(?:can|may|must|should|role|staff))|CLERK_[A-Z_]+/),
  v('Resend', 'email', /\bResend(?:-backed|\s+(?:API|SDK|key|account|webhook|provider))|RESEND_[A-Z_]+/),
  v('Auth0', 'auth'),
  v('Supabase Auth', 'auth'),
  v('Firebase Auth', 'auth'),
  v('Cognito', 'auth'),
  v('Keycloak', 'auth'),
  v('Okta', 'auth'),
  v('Stripe', 'payments'),
  v('Pesapal', 'payments'),
  v('Flutterwave', 'payments'),
  v('Paystack', 'payments'),
  v('PayPal', 'payments'),
  v('Braintree', 'payments'),
  v('Razorpay', 'payments'),
  v('SendGrid', 'email'),
  v('Mailgun', 'email'),
  v('Postmark', 'email'),
  v('Twilio', 'sms'),
  v("Africa's Talking", 'sms', /africa'?s[\s_-]*talking/i),
  v('Vonage', 'sms'),
  v('Google Maps', 'maps'),
];

const GENERIC: Record<VendorCategory, string> = {
  auth: 'the authentication approach in the ledger',
  payments: 'the payment provider in the ledger',
  email: 'the email provider in the ledger',
  sms: 'the SMS provider in the ledger',
  maps: 'the maps provider in the ledger',
};

/** Everything the founder decided, as one lowercase string. */
function ledgerText(ledger: LedgerRow[]): string {
  return ledger.map((r) => r.value).join('\n');
}

/** Vendors that the ledger does NOT name (so they may not appear in the pack). */
export function unapprovedVendors(ledger: LedgerRow[]): Vendor[] {
  const text = ledgerText(ledger);
  return VENDORS.filter((vendor) => !vendor.pattern.test(text));
}

const ENV_LINE = /^\s*[A-Z][A-Z0-9_]*\s*=/;

/**
 * Removes vendor-specific wording from guide/example text. Environment-variable lines naming an unapproved
 * vendor are dropped; other mentions are replaced by a neutral phrase.
 */
export function neutralizeVendors(text: string, ledger: LedgerRow[]): string {
  const banned = unapprovedVendors(ledger);
  if (banned.length === 0 || text === '') return text;
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const hits = banned.filter((b) => b.pattern.test(line));
    if (hits.length === 0) {
      out.push(line);
      continue;
    }
    if (ENV_LINE.test(line)) continue;
    let next = line;
    for (const b of hits) next = next.replace(new RegExp(b.pattern.source, b.pattern.flags.replace('g', '') + 'g'), GENERIC[b.category]);
    out.push(next);
  }
  return out.join('\n');
}

/** A line that talks about options that were considered and not chosen may name any vendor. */
const REJECTION = /alternativ|reject|not chosen|instead of|rather than|considered|\bvs\.?\b|not use|ruled out|compared/i;

export interface VendorHit {
  vendor: Vendor;
  line: string;
}

/** Unapproved vendors mentioned in a document, ignoring fenced code and lines about rejected alternatives. */
export function findVendorMentions(content: string, banned: Vendor[]): VendorHit[] {
  const hits: VendorHit[] = [];
  const seen = new Set<string>();
  let inCode = false;
  for (const line of content.split('\n')) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode || REJECTION.test(line)) continue;
    for (const vendor of banned) {
      if (vendor.pattern.test(line) && !seen.has(vendor.name)) {
        seen.add(vendor.name);
        hits.push({ vendor, line: line.trim().slice(0, 160) });
      }
    }
  }
  return hits;
}
