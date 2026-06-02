const { checkRateLimit } = require('./lib/rateLimit');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = await checkRateLimit(req, 'rewrite');
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait 15 minutes.' });
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await new Promise((resolve, reject) => {
        let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    if (!body.messages) return res.status(400).json({ error: 'Missing: messages' });

    // Use haiku for rewrite — structured JSON output, speed matters
    const payload = { ...body, model: 'claude-haiku-4-5-20251001', max_tokens: body.max_tokens || 2000 };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[rewrite] Anthropic error', response.status, JSON.stringify(data).substring(0,200));
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[rewrite] error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
