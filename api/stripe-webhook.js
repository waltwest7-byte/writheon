/**
 * Stripe webhook handler
 * Listens for checkout.session.completed → generates unlock code → emails buyer
 *
 * IMPORTANT: STRIPE_WEBHOOK_SECRET must be set in Vercel Environment Variables.
 * Never hardcode the secret here.
 */

const crypto = require('crypto');
const { supabaseInsert } = require('./lib/supabase');

// Verify Stripe webhook signature without the stripe npm package
function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) throw new Error('Missing stripe-signature header');
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');

  const parts     = signatureHeader.split(',');
  const tPart     = parts.find(p => p.startsWith('t='));
  const sigPart   = parts.find(p => p.startsWith('v1='));
  if (!tPart || !sigPart) throw new Error('Malformed signature header');

  const timestamp = tPart.slice(2);
  const sig       = sigPart.slice(3);
  const payload   = `${timestamp}.${rawBody}`;
  const expected  = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  // Constant-time comparison prevents timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) {
    throw new Error('Signature mismatch');
  }

  // Reject events older than 5 minutes (replay protection)
  const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (ageSeconds > 300) throw new Error('Webhook timestamp too old');

  return true;
}

// Generate a unique unlock code for the buyer
function generateUnlockCode(tier = 'pro') {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `WRITHEON-${tier.toUpperCase()}-${rand}`;
}

// Send unlock code via Resend
async function sendUnlockEmail(email, code, productName) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[webhook] RESEND_API_KEY not set — skipping email');
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'Writheon <noreply@writheon.com>',
      to: [email],
      subject: `Writheon — Your ${productName} Access Code`,
      html: `
        <div style="background:#060606;color:#ece8e0;padding:40px;max-width:560px;font-family:Georgia,serif">
          <div style="font-family:monospace;font-size:11px;letter-spacing:.2em;color:#c8a44a;text-transform:uppercase;margin-bottom:24px">WRITHEON SDE™</div>
          <h1 style="font-size:28px;font-weight:400;margin-bottom:16px;color:#f4f0e8">${productName} — Access Confirmed</h1>
          <p style="font-size:16px;line-height:1.7;color:#a8a29a;margin-bottom:24px">Your unlock code is below. Enter it on any Writheon tool (Coverage Engine, Script Advisor, or Rewrite Engine) to activate Pro access.</p>
          <div style="background:#0f0f0f;border:1px solid #1c1c1c;border-left:3px solid #c8a44a;padding:20px 24px;margin-bottom:24px">
            <div style="font-family:monospace;font-size:10px;color:#6b6560;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px">Your Unlock Code</div>
            <div style="font-family:monospace;font-size:20px;font-weight:400;color:#c8a44a;letter-spacing:.1em">${code}</div>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#6b6560;margin-bottom:24px">Enter this code in the Upgrade modal on any Writheon tool. Click "Unlock Pro Access" → paste code → click Unlock.</p>
          <a href="https://writheon.com/coverage" style="display:inline-block;font-family:monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#060606;background:#c8a44a;padding:12px 28px;text-decoration:none">Open Coverage Engine →</a>
          <p style="font-size:12px;color:#6b6560;margin-top:32px">Questions? Email hello@writheon.com — Gmoe, Founder · Wesvane LLC</p>
        </div>
      `
    })
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Read raw body for signature verification
  const rawBody = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  const signature = req.headers['stripe-signature'];
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify signature
  try {
    verifyStripeSignature(rawBody, signature, secret);
  } catch (e) {
    console.error('[webhook] Signature verification failed:', e.message);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session     = event.data.object;
    const email       = session.customer_details?.email || session.customer_email;
    const amount      = session.amount_total; // in cents
    const productName = amount <= 1600 ? 'Founding Access ($15/month)' : 'Pro Access ($29/month)';
    const tier        = amount <= 1600 ? 'founding' : 'pro';

    const code = generateUnlockCode(tier);

    console.log('[webhook] checkout.session.completed', { email, amount, tier, code });

    // Save purchase to Supabase
    await supabaseInsert('leads', {
      email: email?.toLowerCase().trim() || null,
      tier,
      verdict: 'purchased',
      source: 'stripe-webhook'
    }).catch(e => console.error('[webhook] Supabase insert failed:', e.message));

    // Email unlock code
    if (email) {
      await sendUnlockEmail(email, code, productName).catch(e =>
        console.error('[webhook] Email send failed:', e.message)
      );
    } else {
      console.warn('[webhook] No email on session — cannot send unlock code');
    }
  } else {
    console.log('[webhook] Unhandled event type:', event.type);
  }

  return res.status(200).json({ received: true });
};
