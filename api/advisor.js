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
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    if (!body.messages) {
      return res.status(400).json({ error: 'Missing required field: messages' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[writheon:advisor] Anthropic error', response.status, JSON.stringify(data).substring(0, 200));
    }

    return res.status(response.status).json(data);

  } catch (err) {
    console.error('[writheon:advisor] Error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
