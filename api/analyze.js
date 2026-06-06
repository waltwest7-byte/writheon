const { buildSystemPrompt } = require('./kb');
const { checkRateLimit } = require('./lib/rateLimit');
const { supabaseInsert } = require('./lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const rl = await checkRateLimit(req, 'analyze');
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

    const { messages, mode, genre, voice, title } = body;
    if (!messages) return res.status(400).json({ error: 'Missing: messages' });

    const system = buildSystemPrompt({ mode, genre, voice, title });

    // Act analysis and synthesis modes use Sonnet for quality; others use Haiku for speed/cost
    const isSynthesis = mode === 'synthesis';
    const isActMode   = mode === 'act1' || mode === 'act2' || mode === 'act3';
    const selectedModel = (isSynthesis || mode === 'full') ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    // Token limits by mode
    const tokenMap = {
      synthesis: 8000,
      full:      6000,
      act1:      3000,
      act2:      3000,
      act3:      3000,
      first10:   2000,
      concept:   1800,
      scene:     1800,
    };
    const selectedTokens = tokenMap[mode] || 2000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: selectedModel, max_tokens: selectedTokens, system, messages })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[analyze] Anthropic error', response.status, JSON.stringify(data).substring(0, 300));
    }

    // Async: save synthesis/full analyses to Supabase
    if (response.ok && data.content?.[0]?.text && (isSynthesis || mode === 'full')) {
      try {
        const raw = data.content[0].text.replace(/```json|```/gi, '').trim();
        const jm = raw.match(/\{[\s\S]*\}/);
        if (jm) {
          const result = JSON.parse(jm[0]);
          supabaseInsert('analyses', {
            title: title || null, genre: genre || null,
            mode: mode || null, voice: voice || null,
            verdict: result.verdict, score: result.score,
            writheon_score: result._writheonScore || null,
            scores: result.scores || null,
            coverage_notes: result.coverageNotes || null,
            structural_assessment: result.structuralAssessment || null,
            priorities: result.priorities || null,
          }).catch(() => {});
        }
      } catch (_) {}
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[analyze] error:', err.message);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
