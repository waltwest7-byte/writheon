module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, title, genre, verdict, tier } = req.body || {};
  console.log('[writheon:capture]', {
    email: email || null,
    title: title || null,
    genre: genre || null,
    verdict: verdict || null,
    tier: tier || null,
    ts: new Date().toISOString()
  });

  return res.status(200).json({ success: true });
};
