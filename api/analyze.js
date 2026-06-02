const { buildSystemPrompt } = require('./kb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Explicit body parsing — Vercel auto-parses JSON but this is a safe fallback
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body', detail: e.message });
      }
    }

    const { messages, mode, genre, voice, title, model, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages' });
    }

    // Build the full Writheon knowledge-base system prompt server-side
    const system = buildSystemPrompt({ mode, genre, voice, title });

    // Select model and token budget based on analysis mode
    const selectedModel = model || 'claude-haiku-4-5-20251001';
    const selectedTokens = mode === 'full' ? 4096 : (max_tokens || 1800);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: selectedTokens,
        system,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[writheon:analyze] Anthropic error', response.status, JSON.stringify(data).substring(0, 300));
    }

    return res.status(response.status).json(data);

  } catch (err) {
    console.error('[writheon:analyze] Handler error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
