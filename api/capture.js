const { supabaseInsert } = require('./lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await new Promise((resolve, reject) => {
        let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const { email, title, genre, verdict, tier, source } = body;
    console.log('[writheon:capture]', { email, title, genre, verdict, tier, source });

    // 1. Write to Supabase leads table
    if (email) {
      await supabaseInsert('leads', {
        email: email.toLowerCase().trim(),
        title: title || null,
        genre: genre || null,
        verdict: verdict || null,
        tier: tier || null,
        source: source || req.headers.referer || null
      });
    }

    // 2. Send email via Resend (when RESEND_API_KEY is set)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && email) {
      try {
        const subject = tier === 'founding'
          ? 'Writheon — Founding Access Confirmed'
          : 'Writheon — Your Analysis Is Ready';

        const html = tier === 'founding'
          ? `<p>You're on the Writheon founding list. When payments go live, your $15/month rate is locked for life.</p><p>— Gmoe, Founder · Writheon</p>`
          : `<p>Your analysis is saved. Return to <a href="https://writheon.com/coverage">writheon.com/coverage</a> anytime to run more coverage.</p><p>— Writheon Coverage Engine™</p>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: 'Writheon <noreply@writheon.com>',
            to: [email],
            subject,
            html
          })
        });
      } catch (e) {
        console.error('[capture] Resend error:', e.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[writheon:capture] error:', err.message);
    return res.status(500).json({ error: 'Capture error' });
  }
};
